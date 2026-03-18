package notifications

import (
	"os"
	"path/filepath"
	"strings"
)

func AudioBaseDir() string {
	base := strings.TrimSpace(os.Getenv("AUDIO_BASE_DIR"))
	if base == "" {
		base = "generated_audio"
	}
	return filepath.Clean(base)
}