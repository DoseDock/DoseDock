package graph

import (
	"context"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/vektah/gqlparser/v2/ast"
)

func (ec *executionContext) unmarshalInputDateTime(ctx context.Context, v any) (time.Time, error) {
	return UnmarshalDateTime(v)
}

func (ec *executionContext) _DateTime(ctx context.Context, sel ast.SelectionSet, v *time.Time) graphql.Marshaler {
	if v == nil {
		return graphql.Null
	}
	return MarshalDateTime(*v)
}

func (ec *executionContext) unmarshalInputJSONObject(ctx context.Context, v any) (map[string]any, error) {
	return UnmarshalJSONObject(v)
}

func (ec *executionContext) _JSONObject(ctx context.Context, sel ast.SelectionSet, v map[string]any) graphql.Marshaler {
	if v == nil {
		return graphql.Null
	}
	return MarshalJSONObject(v)
}
