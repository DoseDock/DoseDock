package notifications

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func SaveReminderWAV(patientID, scheduleID, dueAt string, audio []byte) (string, error) {
	dir := filepath.Join(AudioBaseDir(), patientID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	filename := fmt.Sprintf("%s_%s.wav", scheduleID, sanitizeFilePart(dueAt))
	fullPath := filepath.Join(dir, filename)

	if err := os.WriteFile(fullPath, audio, 0o644); err != nil {
		return "", err
	}

	return fullPath, nil
}

func sanitizeFilePart(s string) string {
	replacer := strings.NewReplacer(":", "-", "/", "-", "\\", "-", " ", "_")
	return replacer.Replace(s)
}