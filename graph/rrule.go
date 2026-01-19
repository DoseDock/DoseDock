package graph

import (
	"fmt"
	"strings"
	"time"

	"github.com/teambition/rrule-go"
)

// ExpandRRULE expands an RRULE string to find occurrences within a time window.
// Returns all occurrence times that fall within [windowStart, windowEnd].
func ExpandRRULE(rruleStr string, dtstart, windowStart, windowEnd time.Time) ([]time.Time, error) {
	// Parse the RRULE string
	// The rrule-go library expects just the RRULE part, not the full iCal format
	cleanRule := rruleStr
	if strings.HasPrefix(strings.ToUpper(cleanRule), "RRULE:") {
		cleanRule = cleanRule[6:]
	}

	// Build the ROption from the rule string
	opt, err := rrule.StrToROption(cleanRule)
	if err != nil {
		return nil, fmt.Errorf("parse rrule '%s': %w", rruleStr, err)
	}

	// Set the start date
	opt.Dtstart = dtstart

	// Create the RRule
	rule, err := rrule.NewRRule(*opt)
	if err != nil {
		return nil, fmt.Errorf("create rrule: %w", err)
	}

	// Get occurrences in the window
	occurrences := rule.Between(windowStart, windowEnd, true)

	return occurrences, nil
}

// IsScheduleDueNow checks if a schedule with the given RRULE is due within the time window.
// Returns the due time if found, or nil if not due.
func IsScheduleDueNow(rruleStr string, startDateISO time.Time, endDateISO *time.Time, windowMinutes int) (*time.Time, error) {
	now := time.Now()

	// Check if schedule is within its valid date range
	if now.Before(startDateISO) {
		return nil, nil
	}
	if endDateISO != nil && now.After(*endDateISO) {
		return nil, nil
	}

	// Calculate the time window
	windowDuration := time.Duration(windowMinutes) * time.Minute
	windowStart := now.Add(-windowDuration)
	windowEnd := now.Add(windowDuration)

	// Expand the RRULE
	occurrences, err := ExpandRRULE(rruleStr, startDateISO, windowStart, windowEnd)
	if err != nil {
		return nil, err
	}

	// Return the first occurrence (closest to now)
	if len(occurrences) > 0 {
		return &occurrences[0], nil
	}

	return nil, nil
}
