package main

import (
	config "cmd/Fake-u/main.go/Internals/Config"
	fakenews "cmd/Fake-u/main.go/Internals/handler/FakeNews"
	"log"
	"net/http"
)

func main() {
	cfg := config.MustLoad()

	//setup router
	router := http.NewServeMux()

	router.HandleFunc("POST /api/GetFakenewsData", fakenews.New())

	//server setup
	server := http.Server{
		Addr:    cfg.Address,
		Handler: router,
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("here is the error %s", err.Error())
	}

}
