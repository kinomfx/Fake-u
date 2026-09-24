package fakenews_model

import "time"

type FakeNews_model struct {
	ID           int       `json:"id"`
	FakeNewsData string    `json:"FakeNewsData"`
	Created_at   time.Time `json:"created_at"`
}
