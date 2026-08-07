from django.urls import path

from .views import assistant_consult, assistant_query

urlpatterns = [
    path("query/", assistant_query, name="assistant-query"),
    path("consult/", assistant_consult, name="assistant-consult"),
]
