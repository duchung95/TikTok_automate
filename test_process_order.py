"""
Unit tests for process_tiktik_order.py helper functions.
Run with:  python3 -m pytest test_process_order.py -v
"""

import pytest
from process_tiktik_order import (
    lookup_variant,
    is_valid_url,
    filter_rows,
    mark_partial_orders,
    STATE_MAP,
)

# ─── Shared fixtures ────────────────────────────────────────────────────────────
VARIANT_MAP = {
    "Bay, M":       174323,
    "Seafoam, XL":  175743,
    "Ivory, S":     170001,
}
SIZE_FIX  = {"XXL": "2XL"}
COLOR_FIX = {"Irovy": "Ivory"}

def make_row(**kwargs):
    """Build a minimal TikTok CSV row dict with sensible defaults."""
    defaults = {
        "Order ID":     "ORD001",
        "Order Status": "To ship",
        "Variation":    "Bay, M",
        "Quantity":     "1",
        "Recipient":    "Test User",
        "Phone#":       "15551234567",
        "Province":     "California",
        "Ship to address":  "123 Main St",
        "Ship to address2": "",
        "City":         "Los Angeles",
        "Zipcode":      "90001",
        "Created Time": "05/21/2026 7:00:00",
    }
    defaults.update(kwargs)
    return defaults


# ─── lookup_variant ─────────────────────────────────────────────────────────────
class TestLookupVariant:
    def test_exact_match(self):
        vid, _ = lookup_variant("Bay, M", VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert vid == 174323

    def test_color_fix_applied(self):
        """'Irovy' should be corrected to 'Ivory' before lookup."""
        vid, fixed = lookup_variant("Irovy, S", VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert vid == 170001
        assert fixed == "Ivory, S"

    def test_size_fix_applied(self):
        """'XXL' should be normalised to '2XL' before lookup."""
        vm = {"Seafoam, 2XL": 999}
        vid, fixed = lookup_variant("Seafoam, XXL", vm, SIZE_FIX, COLOR_FIX)
        assert vid == 999
        assert fixed == "Seafoam, 2XL"

    def test_no_match_returns_none(self):
        vid, _ = lookup_variant("Orchid, XL", VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert vid is None

    def test_single_word_variation(self):
        """Variations without a comma are passed through as-is."""
        vid, fixed = lookup_variant("Unknown", VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert vid is None
        assert fixed == "Unknown"


# ─── is_valid_url ────────────────────────────────────────────────────────────────
class TestIsValidUrl:
    def test_empty_is_valid(self):
        assert is_valid_url("") is True

    def test_https_url(self):
        assert is_valid_url("https://example.com/design.png") is True

    def test_http_url(self):
        assert is_valid_url("http://cdn.example.com/img.jpg") is True

    def test_missing_scheme(self):
        assert is_valid_url("example.com/image.png") is False

    def test_ftp_scheme_rejected(self):
        assert is_valid_url("ftp://example.com/file") is False

    def test_no_netloc(self):
        assert is_valid_url("https://") is False

    def test_plain_text(self):
        assert is_valid_url("not a url at all") is False


# ─── filter_rows ────────────────────────────────────────────────────────────────
class TestFilterRows:
    def test_basic_to_ship_included(self):
        rows = [make_row()]
        result = filter_rows(rows, VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert len(result) == 1
        assert result[0]["order_id"] == "ORD001"

    def test_cancelled_excluded(self):
        rows = [make_row(**{"Order Status": "Cancelled"})]
        assert filter_rows(rows, VARIANT_MAP, SIZE_FIX, COLOR_FIX) == []

    def test_seller_cancel_excluded(self):
        rows = [make_row(**{"Order Status": "Seller Cancel"})]
        assert filter_rows(rows, VARIANT_MAP, SIZE_FIX, COLOR_FIX) == []

    def test_unpaid_excluded(self):
        rows = [make_row(**{"Order Status": "Unpaid"})]
        assert filter_rows(rows, VARIANT_MAP, SIZE_FIX, COLOR_FIX) == []

    def test_non_to_ship_excluded(self):
        rows = [make_row(**{"Order Status": "Completed"})]
        assert filter_rows(rows, VARIANT_MAP, SIZE_FIX, COLOR_FIX) == []

    def test_voucher_row_excluded(self):
        rows = [make_row(Variation="Spend $10, Get $2 Off")]
        assert filter_rows(rows, VARIANT_MAP, SIZE_FIX, COLOR_FIX) == []

    def test_empty_order_id_excluded(self):
        rows = [make_row(**{"Order ID": ""})]
        assert filter_rows(rows, VARIANT_MAP, SIZE_FIX, COLOR_FIX) == []

    def test_phone_strip_country_code(self):
        rows = [make_row(**{"Phone#": "15551234567"})]
        result = filter_rows(rows, VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert result[0]["phone"] == "5551234567"

    def test_phone_already_10_digits(self):
        rows = [make_row(**{"Phone#": "5551234567"})]
        result = filter_rows(rows, VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert result[0]["phone"] == "5551234567"

    def test_state_mapped_to_abbreviation(self):
        rows = [make_row(Province="California")]
        result = filter_rows(rows, VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert result[0]["state"] == "CA"

    def test_unknown_state_passed_through(self):
        rows = [make_row(Province="ZZ")]
        result = filter_rows(rows, VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert result[0]["state"] == "ZZ"

    def test_variant_id_resolved(self):
        rows = [make_row(Variation="Bay, M")]
        result = filter_rows(rows, VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert result[0]["variant_id"] == 174323

    def test_unmatched_variant_is_none(self):
        rows = [make_row(Variation="Orchid, XL")]
        result = filter_rows(rows, VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert result[0]["variant_id"] is None

    def test_multiple_rows_mixed(self):
        rows = [
            make_row(**{"Order ID": "A", "Order Status": "To ship",  "Variation": "Bay, M"}),
            make_row(**{"Order ID": "B", "Order Status": "Cancelled","Variation": "Bay, M"}),
            make_row(**{"Order ID": "C", "Order Status": "To ship",  "Variation": "Seafoam, XL"}),
        ]
        result = filter_rows(rows, VARIANT_MAP, SIZE_FIX, COLOR_FIX)
        assert len(result) == 2
        assert {r["order_id"] for r in result} == {"A", "C"}


# ─── mark_partial_orders ────────────────────────────────────────────────────────
class TestMarkPartialOrders:
    def _make_item(self, order_id, variant_id):
        return {
            "order_id":     order_id,
            "variant_id":   variant_id,
            "partial_lock": False,
            "status_note":  "",
        }

    def test_single_item_order_with_variant_not_partial(self):
        items = [self._make_item("ORD1", 123)]
        mark_partial_orders(items)
        assert items[0]["partial_lock"] is False

    def test_single_item_order_without_variant_not_partial(self):
        """A lonely missing-variant row gets no partial_lock — it's just locked."""
        items = [self._make_item("ORD1", None)]
        mark_partial_orders(items)
        assert items[0]["partial_lock"] is False

    def test_multi_item_all_matched_no_partial(self):
        items = [
            self._make_item("ORD1", 111),
            self._make_item("ORD1", 222),
        ]
        mark_partial_orders(items)
        assert all(i["partial_lock"] is False for i in items)

    def test_multi_item_one_missing_locks_all(self):
        """If one item in an order has no variant_id, the matched sibling gets partial_lock."""
        items = [
            self._make_item("ORD1", 111),   # matched — should become partial_lock
            self._make_item("ORD1", None),  # missing — already locked via variant_id
        ]
        mark_partial_orders(items)
        matched = items[0]
        missing = items[1]
        assert matched["partial_lock"] is True
        assert "Không thể xuất một phần" in matched["status_note"]
        assert missing["partial_lock"] is False  # locked via variant_id, not partial_lock

    def test_different_orders_do_not_affect_each_other(self):
        items = [
            self._make_item("ORD1", 111),
            self._make_item("ORD1", None),  # ORD1 is incomplete
            self._make_item("ORD2", 222),   # ORD2 is fully matched — must NOT be locked
        ]
        mark_partial_orders(items)
        assert items[2]["partial_lock"] is False

    def test_three_items_two_missing_one_matched(self):
        items = [
            self._make_item("ORD1", 111),
            self._make_item("ORD1", None),
            self._make_item("ORD1", None),
        ]
        mark_partial_orders(items)
        assert items[0]["partial_lock"] is True
        assert items[1]["partial_lock"] is False
        assert items[2]["partial_lock"] is False


# ─── STATE_MAP sanity ────────────────────────────────────────────────────────────
class TestStateMap:
    def test_all_50_states_plus_dc(self):
        assert len(STATE_MAP) == 51

    def test_spot_checks(self):
        assert STATE_MAP["California"] == "CA"
        assert STATE_MAP["Texas"] == "TX"
        assert STATE_MAP["New York"] == "NY"
        assert STATE_MAP["District of Columbia"] == "DC"
