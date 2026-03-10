package notifications

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"golang.org/x/oauth2/google"
)

type GoogleTTSClient struct {
	projectID  string
	httpClient *http.Client
}

type TTSResult struct {
	AudioBytes []byte
	MimeType   string
}

func NewGoogleTTSClientFromEnv(ctx context.Context) (*GoogleTTSClient, error) {
	projectID := strings.TrimSpace(os.Getenv("GOOGLE_CLOUD_PROJECT"))
	if projectID == "" {
		return nil, fmt.Errorf("missing GOOGLE_CLOUD_PROJECT")
	}

	client, err := google.DefaultClient(ctx, "https://www.googleapis.com/auth/cloud-platform")
	if err != nil {
		return nil, fmt.Errorf("create google auth client: %w", err)
	}
	client.Timeout = 20 * time.Second

	return &GoogleTTSClient{
		projectID:  projectID,
		httpClient: client,
	}, nil
}

func (c *GoogleTTSClient) SynthesizeDefaultReminder(ctx context.Context, text string) (*TTSResult, error) {
	if strings.TrimSpace(text) == "" {
		return nil, fmt.Errorf("empty tts text")
	}

	body := map[string]any{
		"input": map[string]any{
			"text": text,
		},
		"voice": map[string]any{
			"languageCode": "en-US",
			"name":         "en-US-Chirp3-HD-Charon",
		},
		"audioConfig": map[string]any{
			"audioEncoding": "MP3",
			"speakingRate":  1.0,
		},
	}

	raw, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://texttospeech.googleapis.com/v1/text:synthesize", bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-user-project", c.projectID)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("tts request failed: %w", err)
	}
	defer resp.Body.Close()

	var parsed struct {
		AudioContent string `json:"audioContent"`
		Error        any    `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, fmt.Errorf("decode tts response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("tts failed status=%d body=%v", resp.StatusCode, parsed.Error)
	}

	audioBytes, err := base64.StdEncoding.DecodeString(parsed.AudioContent)
	if err != nil {
		return nil, fmt.Errorf("decode tts audio: %w", err)
	}

	return &TTSResult{
		AudioBytes: audioBytes,
		MimeType:   "audio/mpeg",
	}, nil
}