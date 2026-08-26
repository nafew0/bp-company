"""Helpers for resolving bilingual (_en/_bn) model fields."""


def pick(obj, field, lang):
    """Return the bn value of ``field`` when requested and non-empty, else en.

    ``lang`` other than "bn" (including None) resolves to English.
    """
    if lang == "bn":
        bn_value = getattr(obj, f"{field}_bn")
        if bn_value:
            return bn_value
    return getattr(obj, f"{field}_en")


def request_lang(request):
    """Resolve the requested language from ``?lang=``; anything but bn is en."""
    lang = request.query_params.get("lang")
    return "bn" if lang == "bn" else "en"
