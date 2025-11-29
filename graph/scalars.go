package graph

import (
	"fmt"
	"time"

	"github.com/99designs/gqlgen/graphql"
)

// MarshalDateTime converts time.Time to ISO8601 string.
func MarshalDateTime(t time.Time) graphql.Marshaler {
	return graphql.MarshalTime(t)
}

// UnmarshalDateTime parses ISO8601 strings into time.Time.
func UnmarshalDateTime(v interface{}) (time.Time, error) {
	return graphql.UnmarshalTime(v)
}

// MarshalJSONObject ensures map data is serialized as JSON.
func MarshalJSONObject(v map[string]interface{}) graphql.Marshaler {
	return graphql.MarshalMap(v)
}

// UnmarshalJSONObject guarantees JSON objects become graphql.Map instances.
func UnmarshalJSONObject(v interface{}) (map[string]interface{}, error) {
	if v == nil {
		return map[string]interface{}{}, nil
	}

	m, ok := v.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("JSONObject must be a map")
	}
	return m, nil
}

