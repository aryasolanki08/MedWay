from django.urls import path

from .views import assistant_query

urlpatterns = [
    path("query/", assistant_query, name="assistant-query"),
]
