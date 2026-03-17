package graph

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

var timeLayouts = []string{
	time.RFC3339Nano,
	time.RFC3339,
	"2006-01-02 15:04:05",
	"2006-01-02",
}

func parseDBTime(value string) (time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, fmt.Errorf("empty time string")
	}

	var lastErr error
	for _, layout := range timeLayouts {
		if t, err := time.Parse(layout, value); err == nil {
			return t, nil
		} else {
			lastErr = err
		}
	}
	return time.Time{}, fmt.Errorf("parse time %q: %w", value, lastErr)
}

func parseNullableDBTime(ns sql.NullString) (*time.Time, error) {
	if !ns.Valid || strings.TrimSpace(ns.String) == "" {
		return nil, nil
	}
	t, err := parseDBTime(ns.String)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func formatDBTime(t time.Time) string {
	return t.UTC().Format(time.RFC3339Nano)
}

func formatNullableTimePtr(t *time.Time) sql.NullString {
	if t == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: formatDBTime(*t), Valid: true}
}

func nullStringFromPtr(val *string) sql.NullString {
	if val == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *val, Valid: true}
}

func ptrFromNullString(ns sql.NullString) *string {
	if ns.Valid {
		return &ns.String
	}
	return nil
}

func ptrString(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func nullIntFromPtr(val *int) sql.NullInt64 {
	if val == nil {
		return sql.NullInt64{}
	}
	return sql.NullInt64{Int64: int64(*val), Valid: true}
}

func ptrFromNullInt(ns sql.NullInt64) *int {
	if ns.Valid {
		v := int(ns.Int64)
		return &v
	}
	return nil
}

func hashPassword(password string) (string, error) {
	if password == "" {
		return "", nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(hash), nil
}

func verifyPassword(hashedPassword, password string) error {
	if hashedPassword == "" {
		return fmt.Errorf("no password set for this account")
	}
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

func buildRefillMessage(firstName string, silo int64, stock int64) string {
	siloNumber := silo + 1

	if stock <= 0 {
		return fmt.Sprintf(
			"Hi %s, Silo #%d has run out of pills. Please refill at your earliest convenience.",
			firstName,
			siloNumber,
		)
	}

	return fmt.Sprintf(
		"Hi %s, Silo #%d is running low on pills with %d remaining. Please refill soon.",
		firstName,
		siloNumber,
		stock,
	)
}

func buildCupAbsentMessage(firstName string) string {
	return fmt.Sprintf(
		"Hi %s, DoseDock could not dispense medication because the cup was not in place. Please check the device.",
		firstName,
	)
}

func buildMissedMedicationMessage(firstName string) string {
	return fmt.Sprintf(
		"Hi %s, a scheduled medication dose was missed. Please check on the patient.",
		firstName,
	)
}

func buildEmptySiloMessage(firstName string, silo int64) string {
	siloNumber := silo + 1
	return fmt.Sprintf(
		"Hi %s, Silo #%d could not dispense medication. Please check the device, the silo could be empty.",
		firstName,
		siloNumber,
	)
}