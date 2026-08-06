from django.urls import path

from .views import search_medicine, autocomplete, prescription_ocr

urlpatterns = [
    path("search/", search_medicine, name="search-medicine"),
    path("autocomplete/", autocomplete, name="autocomplete"),
    path("prescription-ocr/", prescription_ocr, name="prescription-ocr"),
]
