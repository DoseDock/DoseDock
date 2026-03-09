package notifications

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/teambition/rrule-go"

	"pillbox/internal/db"
)

type Worker struct {
	queries *db.Queries
	sender  *TwilioSender
}

func NewWorker(queries *db.Queries, sender *TwilioSender) *Worker {
	return &Worker{
		queries: queries,
		sender:  sender,
	}
}

func (w *Worker) Start(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	w.runOnce(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.runOnce(ctx)
		}
	}
}

func (w *Worker) runOnce(ctx context.Context) {
	patients, err := w.queries.ListPatients(ctx)
	if err != nil {
		log.Printf("notification worker: list patients: %v", err)
		return
	}

	for _, patient := range patients {
		if !patient.UserID.Valid || strings.TrimSpace(patient.UserID.String) == "" {
			continue
		}

		user, err := w.queries.GetUser(ctx, patient.UserID.String)
		if err != nil {
			log.Printf("notification worker: get user %s: %v", patient.UserID.String, err)
			continue
		}

		if !user.Phone.Valid || strings.TrimSpace(user.Phone.String) == "" {
			continue
		}

		schedules, err := w.queries.ListSchedulesByPatient(ctx, patient.ID)
		if err != nil {
			log.Printf("notification worker: list schedules for patient %s: %v", patient.ID, err)
			continue
		}

		for _, schedule := range schedules {
			if schedule.Status != "ACTIVE" {
				continue
			}

			startDate, err := parseDBTime(schedule.StartDateIso)
			if err != nil {
				log.Printf("notification worker: parse start date for schedule %s: %v", schedule.ID, err)
				continue
			}

			var endDate *time.Time
			if schedule.EndDateIso.Valid {
				parsed, err := parseDBTime(schedule.EndDateIso.String)
				if err == nil {
					endDate = &parsed
				}
			}

			dueTime, err := isScheduleDueNow(schedule.Rrule, startDate, endDate, 1)
			if err != nil {
				log.Printf("notification worker: evaluate due schedule %s: %v", schedule.ID, err)
				continue
			}
			if dueTime == nil {
				continue
			}

			alreadySent, err := w.hasNotificationEvent(ctx, patient.ID, schedule.ID, *dueTime, "SMS")
			if err != nil {
				log.Printf("notification worker: check existing notification event: %v", err)
				continue
			}
			if alreadySent {
				continue
			}

			items, err := w.queries.ListScheduleItemsBySchedule(ctx, schedule.ID)
			if err != nil {
				log.Printf("notification worker: list schedule items for %s: %v", schedule.ID, err)
				continue
			}

			medParts := make([]string, 0, len(items))
			for _, item := range items {
				label := strings.TrimSpace(item.MedicationLabel)
				if label == "" {
					label = "medication"
				}
				medParts = append(medParts, fmt.Sprintf("%d %s", item.Qty, label))
			}

			meds := strings.Join(medParts, ", ")
			localDue := dueTime.In(time.Local).Format("3:04 PM")
			message := fmt.Sprintf(
				"DoseDock reminder: %s %s should take %s at %s.",
				patient.FirstName,
				patient.LastName,
				meds,
				localDue,
			)

			log.Printf("notification worker: sending sms to %s for patient=%s schedule=%s", user.Phone.String, patient.ID, schedule.ID)
			providerID, sendErr := w.sender.SendSMS(ctx, user.Phone.String, message)

			status := "SENT"
			errorMessage := sql.NullString{}
			if sendErr != nil {
				status = "FAILED"
				errorMessage = sql.NullString{String: sendErr.Error(), Valid: true}
				log.Printf("notification worker: send sms failed: %v", sendErr)
			}

			_, createErr := w.queries.CreateNotificationEvent(ctx, db.CreateNotificationEventParams{
				ID:                uuid.NewString(),
				PatientID:         patient.ID,
				ScheduleID:        schedule.ID,
				UserID:            sql.NullString{String: user.ID, Valid: true},
				DueAtIso:          formatDBTime(*dueTime),
				Channel:           "SMS",
				Destination:       user.Phone.String,
				Message:           message,
				Status:            status,
				ProviderMessageID: nullableString(providerID),
				ErrorMessage:      errorMessage,
			})
			if createErr != nil {
				log.Printf("notification worker: create notification event failed: %v", createErr)
			}
		}
	}
}

func (w *Worker) hasNotificationEvent(ctx context.Context, patientID, scheduleID string, dueAt time.Time, channel string) (bool, error) {
	_, err := w.queries.GetNotificationEventByOccurrence(ctx, db.GetNotificationEventByOccurrenceParams{
		PatientID:  patientID,
		ScheduleID: scheduleID,
		DueAtIso:   formatDBTime(dueAt),
		Channel:    channel,
	})
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func nullableString(s string) sql.NullString {
	if strings.TrimSpace(s) == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}

func parseDBTime(value string) (time.Time, error) {
	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02",
	}
	value = strings.TrimSpace(value)
	for _, layout := range layouts {
		if t, err := time.Parse(layout, value); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("unable to parse time %q", value)
}

func formatDBTime(t time.Time) string {
	return t.UTC().Format(time.RFC3339Nano)
}

func isScheduleDueNow(rruleStr string, startDate time.Time, endDate *time.Time, windowMinutes int) (*time.Time, error) {
	now := time.Now()

	if now.Before(startDate) {
		return nil, nil
	}
	if endDate != nil && now.After(*endDate) {
		return nil, nil
	}

	cleanRule := rruleStr
	if strings.HasPrefix(strings.ToUpper(cleanRule), "RRULE:") {
		cleanRule = cleanRule[6:]
	}

	opt, err := rrule.StrToROption(cleanRule)
	if err != nil {
		return nil, err
	}
	opt.Dtstart = startDate

	rule, err := rrule.NewRRule(*opt)
	if err != nil {
		return nil, err
	}

	window := time.Duration(windowMinutes) * time.Minute
	occurrences := rule.Between(now.Add(-window), now.Add(window), true)
	if len(occurrences) == 0 {
		return nil, nil
	}

	return &occurrences[0], nil
}