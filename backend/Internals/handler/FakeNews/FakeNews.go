package fakenews

import (
	fakenews_model "cmd/Fake-u/main.go/Internals/types/FakeNews"
	"cmd/Fake-u/main.go/Internals/utils/response"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
)

func New() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var News fakenews_model.FakeNews_model
		err := json.NewDecoder(r.Body).Decode(&News)
		if errors.Is(err, io.EOF) {
			response.HandleNew(w, http.StatusBadRequest, err.Error())
			return
		}
		slog.Info("creating FakeNews")
		fmt.Print(News.FakeNewsData)
		response.HandleNew(w, http.StatusCreated, map[string]string{"success": "OK"})
	}
}
