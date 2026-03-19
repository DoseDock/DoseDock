package notifications

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

type AudioHTTPHandler struct{}

func NewAudioHTTPHandler() *AudioHTTPHandler {
	return &AudioHTTPHandler{}
}

type pendingAudioFile struct {
	Filename     string
	ScheduleID   string
	DueAtUTC     string
	DueAtTime    time.Time
	AbsolutePath string
}

func (h *AudioHTTPHandler) HandleNextAudio(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        methodNotAllowed(w, http.MethodGet)
        return
    }

    parts := splitPath(r.URL.Path)
    if len(parts) != 3 || parts[0] != "patients" || parts[2] != "next-audio" {
        http.NotFound(w, r)
        return
    }

    patientID := parts[1]
    dir := filepath.Join(AudioBaseDir(), patientID)
    println("HandleNextAudio patientID=", patientID, " dir=", dir)

    files, err := listPendingAudio(patientID)
    if err != nil {
        writeJSON(w, http.StatusInternalServerError, map[string]any{
            "error": err.Error(),
        })
        return
    }

    println("HandleNextAudio found files=", len(files))

    if len(files) == 0 {
        writeJSON(w, http.StatusNotFound, map[string]any{
            "message":    "No pending audio",
            "patient_id": patientID,
        })
        return
    }

    next := files[0]

    writeJSON(w, http.StatusOK, map[string]any{
        "patient_id":  patientID,
        "schedule_id": next.ScheduleID,
        "due_at_utc":  next.DueAtUTC,
        "filename":    next.Filename,
        "audio_url":   "/audio/" + patientID + "/" + next.Filename,
        "ack_url":     "/patients/" + patientID + "/ack/" + next.Filename,
    })
}

func (h *AudioHTTPHandler) HandleServeAudio(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w, http.MethodGet)
		return
	}

	// /audio/{patientID}/{filename}
	parts := splitPath(r.URL.Path)
	if len(parts) != 3 || parts[0] != "audio" {
		http.NotFound(w, r)
		return
	}

	patientID := parts[1]
	filename := filepath.Base(parts[2])

	fullPath := filepath.Join(AudioBaseDir(), patientID, filename)
	if !isSafeUnderBase(fullPath, filepath.Join(AudioBaseDir(), patientID)) {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": "invalid file path",
		})
		return
	}

	info, err := os.Stat(fullPath)
	if err != nil || info.IsDir() {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "audio/wav")
	http.ServeFile(w, r, fullPath)
}

func (h *AudioHTTPHandler) HandleAckAudio(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w, http.MethodPost)
		return
	}

	// /patients/{patientID}/ack/{filename}
	parts := splitPath(r.URL.Path)
	if len(parts) != 4 || parts[0] != "patients" || parts[2] != "ack" {
		http.NotFound(w, r)
		return
	}

	patientID := parts[1]
	filename := filepath.Base(parts[3])

	src := filepath.Join(AudioBaseDir(), patientID, filename)
	patientDir := filepath.Join(AudioBaseDir(), patientID)
	if !isSafeUnderBase(src, patientDir) {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error": "invalid file path",
		})
		return
	}

	info, err := os.Stat(src)
	if err != nil || info.IsDir() {
		writeJSON(w, http.StatusNotFound, map[string]any{
			"error": "audio file not found",
		})
		return
	}

	if err := os.Remove(src); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{
			"error": err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"message":    "Acknowledged and deleted",
		"patient_id": patientID,
		"filename":   filename,
	})
}

func listPendingAudio(patientID string) ([]pendingAudioFile, error) {
    patientDir := filepath.Join(AudioBaseDir(), patientID)
    println("listPendingAudio reading dir=", patientDir)

    entries, err := os.ReadDir(patientDir)
    if err != nil {
        println("listPendingAudio read error=", err.Error())
        if os.IsNotExist(err) {
            return []pendingAudioFile{}, nil
        }
        return nil, err
    }

    var files []pendingAudioFile
    for _, entry := range entries {
        if entry.IsDir() {
            continue
        }

        name := entry.Name()
        println("listPendingAudio saw file=", name)

        if !strings.HasSuffix(strings.ToLower(name), ".wav") {
            println("skipping non-wav=", name)
            continue
        }

        scheduleID, dueAtUTC, dueAtTime, err := parseAudioFilename(name)
        if err != nil {
            println("parseAudioFilename failed for", name, " err=", err.Error())
            continue
        }

        files = append(files, pendingAudioFile{
            Filename:     name,
            ScheduleID:   scheduleID,
            DueAtUTC:     dueAtUTC,
            DueAtTime:    dueAtTime,
            AbsolutePath: filepath.Join(patientDir, name),
        })
    }

    sort.Slice(files, func(i, j int) bool {
        return files[i].DueAtTime.Before(files[j].DueAtTime)
    })

    return files, nil
}

func parseAudioFilename(filename string) (scheduleID string, dueAtUTC string, dueAtTime time.Time, err error) {
	if !strings.HasSuffix(strings.ToLower(filename), ".wav") {
		return "", "", time.Time{}, errors.New("not wav")
	}

	stem := strings.TrimSuffix(filename, ".wav")
	idx := strings.Index(stem, "_")
	if idx <= 0 || idx >= len(stem)-1 {
		return "", "", time.Time{}, errors.New("invalid format")
	}

	scheduleID = stem[:idx]
	dueAtRaw := stem[idx+1:]

	parts := strings.SplitN(dueAtRaw, "T", 2)
	if len(parts) != 2 {
		return "", "", time.Time{}, errors.New("invalid due at")
	}

	datePart := parts[0]
	timePart := strings.TrimSuffix(parts[1], "Z")
	timeFields := strings.Split(timePart, "-")
	if len(timeFields) != 3 {
		return "", "", time.Time{}, errors.New("invalid due at time")
	}

	dueAtUTC = datePart + "T" + timeFields[0] + ":" + timeFields[1] + ":" + timeFields[2] + "Z"
	dueAtTime, err = time.Parse(time.RFC3339, dueAtUTC)
	if err != nil {
		return "", "", time.Time{}, err
	}

	return scheduleID, dueAtUTC, dueAtTime, nil
}

func splitPath(path string) []string {
	path = strings.Trim(path, "/")
	if path == "" {
		return nil
	}
	return strings.Split(path, "/")
}

func isSafeUnderBase(fullPath, baseDir string) bool {
	fullPath = filepath.Clean(fullPath)
	baseDir = filepath.Clean(baseDir)

	rel, err := filepath.Rel(baseDir, fullPath)
	if err != nil {
		return false
	}
	return rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator))
}

func methodNotAllowed(w http.ResponseWriter, allowed string) {
	w.Header().Set("Allow", allowed)
	writeJSON(w, http.StatusMethodNotAllowed, map[string]any{
		"error": "method not allowed",
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}