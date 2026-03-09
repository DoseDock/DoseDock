package notifications

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type TwilioSender struct {
	accountSID          string
	authToken           string
	messagingServiceSID string
	httpClient          *http.Client
}

func NewTwilioSenderFromEnv() (*TwilioSender, error) {
	accountSID := strings.TrimSpace(os.Getenv("TWILIO_ACCOUNT_SID"))
	authToken := strings.TrimSpace(os.Getenv("TWILIO_AUTH_TOKEN"))
	messagingServiceSID := strings.TrimSpace(os.Getenv("TWILIO_MESSAGING_SERVICE_SID"))

	if accountSID == "" || authToken == "" || messagingServiceSID == "" {
		return nil, fmt.Errorf("missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_MESSAGING_SERVICE_SID")
	}

	return &TwilioSender{
		accountSID:          accountSID,
		authToken:           authToken,
		messagingServiceSID: messagingServiceSID,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}, nil
}

func (t *TwilioSender) SendSMS(ctx context.Context, to, body string) (string, error) {
	if strings.TrimSpace(to) == "" {
		return "", fmt.Errorf("missing destination phone number")
	}
	if strings.TrimSpace(body) == "" {
		return "", fmt.Errorf("missing sms body")
	}

	form := url.Values{}
	form.Set("To", to)
	form.Set("MessagingServiceSid", t.messagingServiceSID)
	form.Set("Body", body)

	endpoint := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", t.accountSID)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return "", fmt.Errorf("build twilio request: %w", err)
	}

	basicAuth := base64.StdEncoding.EncodeToString([]byte(t.accountSID + ":" + t.authToken))
	req.Header.Set("Authorization", "Basic "+basicAuth)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := t.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("send twilio request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("twilio send failed: status=%d body=%s", resp.StatusCode, string(respBody))
	}

	return "", nil
}