package graph

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"pillbox/graph/model"
	"pillbox/internal/db"
)

func (r *Resolver) buildUserModel(ctx context.Context, userID, email, fullName string, phone sql.NullString, timezone, createdAt, updatedAt string) (*model.User, error) {
	created, err := parseDBTime(createdAt)
	if err != nil {
		return nil, err
	}
	updated, err := parseDBTime(updatedAt)
	if err != nil {
		return nil, err
	}

	patientRecords, err := r.Queries.ListPatientsByUser(ctx, sql.NullString{String: userID, Valid: true})
	if err != nil {
		return nil, fmt.Errorf("load patients for user %s: %w", userID, err)
	}

	patients := make([]*model.Patient, 0, len(patientRecords))
	for _, p := range patientRecords {
		mp, err := r.buildPatientModel(ctx, p)
		if err != nil {
			return nil, err
		}
		patients = append(patients, mp)
	}

	return &model.User{
		ID:        userID,
		Email:     email,
		FullName:  fullName,
		Phone:     ptrFromNullString(phone),
		Timezone:  timezone,
		CreatedAt: created,
		UpdatedAt: updated,
		Patients:  patients,
	}, nil
}

func (r *Resolver) buildPatientModel(ctx context.Context, record db.Patient) (*model.Patient, error) {
	createdAt, err := parseDBTime(record.CreatedAt)
	if err != nil {
		return nil, err
	}
	updatedAt, err := parseDBTime(record.UpdatedAt)
	if err != nil {
		return nil, err
	}
	dob, err := parseNullableDBTime(record.DateOfBirth)
	if err != nil {
		return nil, err
	}
	metadata, err := decodeMetadata(record.Metadata)
	if err != nil {
		return nil, err
	}

	meds, err := r.loadMedications(ctx, record.ID)
	if err != nil {
		return nil, err
	}

	schedules, err := r.loadSchedules(ctx, record.ID)
	if err != nil {
		return nil, err
	}

	upcoming, err := r.loadUpcomingEvents(ctx, record.ID, 5)
	if err != nil {
		return nil, err
	}

	return &model.Patient{
		ID:                     record.ID,
		UserID:                 ptrFromNullString(record.UserID),
		FirstName:              record.FirstName,
		LastName:               record.LastName,
		DateOfBirth:            dob,
		Gender:                 ptrFromNullString(record.Gender),
		Timezone:               record.Timezone,
		PreferredLanguage:      ptrFromNullString(record.PreferredLanguage),
		CaregiverName:          ptrFromNullString(record.CaregiverName),
		CaregiverEmail:         ptrFromNullString(record.CaregiverEmail),
		CaregiverPhone:         ptrFromNullString(record.CaregiverPhone),
		Notes:                  ptrFromNullString(record.Notes),
		Metadata:               metadata,
		CreatedAt:              createdAt,
		UpdatedAt:              updatedAt,
		Medications:            meds,
		Schedules:              schedules,
		UpcomingDispenseEvents: upcoming,
	}, nil
}

func (r *Resolver) loadMedications(ctx context.Context, patientID string) ([]*model.Medication, error) {
	rows, err := r.Queries.ListMedicationsByPatient(ctx, patientID)
	if err != nil {
		return nil, fmt.Errorf("list medications: %w", err)
	}
	result := make([]*model.Medication, 0, len(rows))
	for _, row := range rows {
		m, err := buildMedicationModel(row)
		if err != nil {
			return nil, err
		}
		result = append(result, m)
	}
	return result, nil
}

func buildMedicationModel(row db.Medication) (*model.Medication, error) {
	createdAt, err := parseDBTime(row.CreatedAt)
	if err != nil {
		return nil, err
	}
	updatedAt, err := parseDBTime(row.UpdatedAt)
	if err != nil {
		return nil, err
	}

	metadata, err := decodeMetadata(row.Metadata)
	if err != nil {
		return nil, err
	}

	return &model.Medication{
		ID:                row.ID,
		PatientID:         row.PatientID,
		Name:              row.Name,
		Nickname:          ptrFromNullString(row.Nickname),
		Color:             ptrFromNullString(row.Color),
		Shape:             ptrFromNullString(row.Shape),
		DosageForm:        ptrFromNullString(row.DosageForm),
		Strength:          ptrFromNullString(row.Strength),
		DosageMg:          ptrFromNullInt(row.DosageMg),
		Instructions:      ptrFromNullString(row.Instructions),
		StockCount:        int(row.StockCount),
		LowStockThreshold: int(row.LowStockThreshold),
		CartridgeIndex:    ptrFromNullInt(row.CartridgeIndex),
		Manufacturer:      ptrFromNullString(row.Manufacturer),
		ExternalID:        ptrFromNullString(row.ExternalID),
		MaxDailyDose:      int(row.MaxDailyDose),
		Metadata:          metadata,
		CreatedAt:         createdAt,
		UpdatedAt:         updatedAt,
	}, nil
}

func (r *Resolver) loadSchedules(ctx context.Context, patientID string) ([]*model.Schedule, error) {
	rows, err := r.Queries.ListSchedulesByPatient(ctx, patientID)
	if err != nil {
		return nil, fmt.Errorf("list schedules: %w", err)
	}

	result := make([]*model.Schedule, 0, len(rows))
	for _, row := range rows {
		item, err := r.buildScheduleModel(ctx, row)
		if err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, nil
}

func (r *Resolver) buildScheduleModel(ctx context.Context, record db.Schedule) (*model.Schedule, error) {
	start, err := parseDBTime(record.StartDateIso)
	if err != nil {
		return nil, err
	}
	end, err := parseNullableDBTime(record.EndDateIso)
	if err != nil {
		return nil, err
	}
	createdAt, err := parseDBTime(record.CreatedAt)
	if err != nil {
		return nil, err
	}
	updatedAt, err := parseDBTime(record.UpdatedAt)
	if err != nil {
		return nil, err
	}
	metadata, err := decodeMetadata(record.Metadata)
	if err != nil {
		return nil, err
	}

	itemRows, err := r.Queries.ListScheduleItemsBySchedule(ctx, record.ID)
	if err != nil {
		return nil, fmt.Errorf("list schedule items: %w", err)
	}

	items := make([]*model.ScheduleItem, 0, len(itemRows))
	for _, row := range itemRows {
		med, err := buildMedicationModel(db.Medication{
			ID:                row.MedicationID,
			PatientID:         row.MedicationPatientID,
			Name:              row.MedicationName,
			Nickname:          row.MedicationNickname,
			Color:             row.MedicationColor,
			Shape:             row.MedicationShape,
			DosageForm:        row.MedicationDosageForm,
			Strength:          row.MedicationStrength,
			DosageMg:          row.MedicationDosageMg,
			Instructions:      row.MedicationInstructions,
			StockCount:        row.MedicationStockCount,
			LowStockThreshold: row.MedicationLowStockThreshold,
			CartridgeIndex:    row.MedicationCartridgeIndex,
			Manufacturer:      row.MedicationManufacturer,
			ExternalID:        row.MedicationExternalID,
			MaxDailyDose:      row.MedicationMaxDailyDose,
			Metadata:          row.MedicationMetadata,
			CreatedAt:         row.MedicationCreatedAt,
			UpdatedAt:         row.MedicationUpdatedAt,
		})
		if err != nil {
			return nil, err
		}

		items = append(items, &model.ScheduleItem{
			ID:           row.ScheduleItemID,
			ScheduleID:   row.ScheduleID,
			Medication:   med,
			Qty:          int(row.Qty),
			Instructions: ptrFromNullString(row.ScheduleItemInstructions),
		})
	}

	return &model.Schedule{
		ID:                    record.ID,
		PatientID:             record.PatientID,
		Title:                 record.Title,
		Timezone:              record.Timezone,
		Rrule:                 record.Rrule,
		StartDateIso:          start,
		EndDateIso:            end,
		LockoutMinutes:        int(record.LockoutMinutes),
		SnoozeIntervalMinutes: int(record.SnoozeIntervalMinutes),
		SnoozeMax:             int(record.SnoozeMax),
		Status:                model.ScheduleStatus(record.Status),
		Notes:                 ptrFromNullString(record.Notes),
		Metadata:              metadata,
		Items:                 items,
		CreatedAt:             createdAt,
		UpdatedAt:             updatedAt,
	}, nil
}

func (r *Resolver) loadUpcomingEvents(ctx context.Context, patientID string, limit int) ([]*model.DispenseEvent, error) {
	now := time.Now().UTC()
	start := now
	end := now.Add(7 * 24 * time.Hour)

	events, err := r.fetchEvents(ctx, patientID, start, end)
	if err != nil {
		return nil, err
	}

	if len(events) > limit {
		return events[:limit], nil
	}
	return events, nil
}

func buildDispenseEvent(row db.DispenseEvent) (*model.DispenseEvent, error) {
	due, err := parseDBTime(row.DueAtIso)
	if err != nil {
		return nil, err
	}
	acted, err := parseNullableDBTime(row.ActedAtIso)
	if err != nil {
		return nil, err
	}
	createdAt, err := parseDBTime(row.CreatedAt)
	if err != nil {
		return nil, err
	}
	metadata, err := decodeMetadata(row.Metadata)
	if err != nil {
		return nil, err
	}

	return &model.DispenseEvent{
		ID:             row.ID,
		PatientID:      row.PatientID,
		ScheduleID:     row.ScheduleID,
		ScheduleItemID: ptrFromNullString(row.ScheduleItemID),
		DueAtIso:       due,
		ActedAtIso:     acted,
		Status:         model.DispenseStatus(row.Status),
		ActionSource:   ptrFromNullString(row.ActionSource),
		Notes:          ptrFromNullString(row.Notes),
		Metadata:       metadata,
		CreatedAt:      createdAt,
	}, nil
}

func (r *Resolver) fetchEvents(ctx context.Context, patientID string, start, end time.Time) ([]*model.DispenseEvent, error) {
	rows, err := r.Queries.ListDispenseEventsByPatient(ctx, db.ListDispenseEventsByPatientParams{
		PatientID:  patientID,
		DueAtIso:   formatDBTime(start),
		DueAtIso_2: formatDBTime(end),
	})
	if err != nil {
		return nil, fmt.Errorf("list dispense events: %w", err)
	}

	result := make([]*model.DispenseEvent, 0, len(rows))
	for _, row := range rows {
		ev, err := buildDispenseEvent(row)
		if err != nil {
			return nil, err
		}
		result = append(result, ev)
	}
	return result, nil
}
