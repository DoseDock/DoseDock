package notifications

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func SaveReminderMP3(patientID, scheduleID, dueAt string, audio []byte) (string, error) {
	dir := filepath.Join("generated_audio", patientID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}

	filename := fmt.Sprintf("%s_%s.mp3", scheduleID, sanitizeFilePart(dueAt))
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