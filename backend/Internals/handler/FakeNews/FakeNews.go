package fakenews

import (
	"log"
	"net/http"
)

func New() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, err := w.Write([]byte("Hello bacchoo"))
		if err != nil {
			log.Fatalf("here is the error : %s ", err.Error())
		}
	}
}
