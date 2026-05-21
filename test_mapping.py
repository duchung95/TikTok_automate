"""
Tests that verify flashship_mapping.json is internally consistent:
- Every non-null variant_id can actually be found via lookup_variant()
- All color_fix / size_fix corrections are reflected in the map keys
- Spot-checks for specific known TikTok variation strings
Run:  python3 -m pytest test_mapping.py -v
"""

import json
import os
import pytest
from process_tiktik_order import lookup_variant

MAPPING_PATH = os.path.join(os.path.dirname(__file__), "flashship_mapping.json")

with open(MAPPING_PATH, encoding="utf-8") as f:
    _mapping = json.load(f)

VARIANT_MAP = _mapping["variant_map"]
SIZE_FIX    = _mapping.get("size_fix", {})
COLOR_FIX   = _mapping.get("color_fix", {})


# ─── Helpers ────────────────────────────────────────────────────────────────────
def all_mapped_entries():
    """Yield (raw_key, expected_id) for every non-null entry in variant_map."""
    for key, vid in VARIANT_MAP.items():
        if vid is not None:
            yield key, vid


# ─── 1. Every non-null entry resolves correctly ──────────────────────────────────
@pytest.mark.parametrize("variation,expected_id", list(all_mapped_entries()))
def test_mapped_variation_resolves(variation, expected_id):
    """
    Each key in variant_map that has a non-null ID must be resolvable by
    lookup_variant() — i.e., the key must already use the corrected color/size
    names so the lookup actually finds it.
    """
    vid, _ = lookup_variant(variation, VARIANT_MAP, SIZE_FIX, COLOR_FIX)
    assert vid == expected_id, (
        f"'{variation}' resolved to {vid!r} instead of {expected_id}. "
        f"Likely the map key uses a raw (unfixed) name — "
        f"check color_fix ({COLOR_FIX}) and size_fix ({SIZE_FIX})."
    )


# ─── 2. color_fix keys must NOT appear as map keys ───────────────────────────────
class TestColorFixConsistency:
    """
    If color_fix maps 'Irovy' → 'Ivory', then 'Irovy' must not be a key prefix
    in the variant_map — all such entries should have been stored as 'Ivory, *'.
    """
    def test_raw_color_names_absent_from_map(self):
        bad = [
            key for key in VARIANT_MAP
            if any(key.startswith(raw + ",") for raw in COLOR_FIX)
        ]
        assert bad == [], (
            f"These map keys still use raw (unfixed) color names: {bad}\n"
            f"They should use corrected names from color_fix={COLOR_FIX}"
        )


# ─── 3. size_fix keys must NOT appear as map key suffixes ────────────────────────
class TestSizeFixConsistency:
    """
    If size_fix maps 'XXL' → '2XL', then no map key should end with ', XXL'.
    All such entries should have been stored as '*, 2XL'.
    """
    def test_raw_size_names_absent_from_map(self):
        bad = [
            key for key in VARIANT_MAP
            if any(key.endswith(", " + raw) for raw in SIZE_FIX)
        ]
        assert bad == [], (
            f"These map keys still use raw (unfixed) size names: {bad}\n"
            f"They should use corrected names from size_fix={SIZE_FIX}"
        )


# ─── 4. Spot-checks: known TikTok variation strings ─────────────────────────────
class TestKnownVariations:
    """
    These are real variation strings from TikTok orders.
    Tests confirm end-to-end resolution including fix application.
    """
    def test_bay_m(self):
        vid, _ = lookup_variant("Bay, M", VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert vid is not None

    def test_seafoam_xl(self):
        vid, _ = lookup_variant("Seafoam, XL", VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert vid is not None

    def test_pepper_xl(self):
        vid, _ = lookup_variant("Pepper, XL", VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert vid is not None

    def test_blue_jean_xxl_via_size_fix(self):
        """TikTok sends 'XXL'; size_fix normalises to '2XL' before lookup."""
        vid, fixed = lookup_variant("Blue Jean, XXL", VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert fixed == "Blue Jean, 2XL", f"size_fix not applied, got: {fixed}"
        assert vid is not None, "Blue Jean, 2XL should resolve after size_fix"

    def test_irovy_xl_via_color_fix(self):
        """TikTok sends 'Irovy'; color_fix normalises to 'Ivory' before lookup."""
        vid, fixed = lookup_variant("Irovy, XL", VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert fixed == "Ivory, XL", f"color_fix not applied, got: {fixed}"
        assert vid is not None, "Ivory, XL should resolve after color_fix"

    def test_unmatched_returns_none(self):
        # "Purple, XL" is not a real Comfort Colors color — should not resolve
        vid, _ = lookup_variant("Purple, XL", VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert vid is None

    def test_crunchberry_via_color_fix(self):
        # "Crunchberry" is fixed to "Crunch Berry" via color_fix
        vid, _ = lookup_variant("Crunchberry, L", VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert vid == 32303
