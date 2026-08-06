"""Free-text query -> the one Salt it means. Shared by catalog.views.search_medicine
and customer.views._resolve_salt, which used to each carry their own (buggy)
copy of this logic -- see resolve_salt's docstring for what was wrong.
"""

from .models import Salt


def resolve_salt(query):
    """Resolves a free-text query (brand or salt name) to the single best
    matching Salt.

    Checked in order, returning on the first match:
      1. Exact salt name (case-insensitive).
      2. Exact brand name (case-insensitive) -> that medicine's salt.
      3. Partial salt-name match, shortest name first.
      4. Partial brand-name match, shortest brand first.

    Steps 3/4 exist for typo/partial tolerance ("cetiriz" -> Cetirizine),
    but need the shortest-first tiebreak: a naive `icontains` first-match
    (the previous implementation) will happily match "Cetirizine" against
    the salt "Levocetirizine" too, since "Levocetirizine" contains
    "cetirizine" as a substring -- with no explicit ordering, whichever
    row the DB happened to return first won, silently returning the wrong
    salt (and therefore wrong/empty search results) for a real, exact
    query.
    """
    query = query.strip()
    if not query:
        return None

    exact_salt = Salt.objects.filter(name__iexact=query).first()
    if exact_salt:
        return exact_salt

    exact_brand = Salt.objects.filter(medicines__brand_name__iexact=query).first()
    if exact_brand:
        return exact_brand

    partial_salt = (
        Salt.objects.filter(name__icontains=query)
        .distinct()
        .order_by("name")
    )
    partial_salt = min(partial_salt, key=lambda s: len(s.name), default=None)
    if partial_salt:
        return partial_salt

    partial_brand = (
        Salt.objects.filter(medicines__brand_name__icontains=query)
        .distinct()
    )
    return min(partial_brand, key=lambda s: len(s.name), default=None)
