"""روابط الكتالوج (router + مسارات مخصّصة)."""
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    GameViewSet, PriceGroupViewSet, ProductViewSet,
    auto_route_view, bulk_price_view, dealer_bulk_group_view, dealer_price_update_view, dealer_prices_view,
    game_library_packages_view, library_browse_view, library_import_view,
    price_matrix_view, product_links_view, refresh_costs_view, refresh_link_prices_view,
    set_price_view,
)

router = DefaultRouter()
router.register("games", GameViewSet, basename="game")
router.register("products", ProductViewSet, basename="product")
router.register("price-groups", PriceGroupViewSet, basename="price-group")

urlpatterns = [
    path("price-matrix/", price_matrix_view, name="price-matrix"),
    path("set-price/", set_price_view, name="set-price"),
    path("bulk-price/", bulk_price_view, name="bulk-price"),
    path("auto-route/", auto_route_view, name="auto-route"),
    path("refresh-costs/", refresh_costs_view, name="refresh-costs"),
    path("dealer-prices/", dealer_prices_view, name="dealer-prices"),
    path("dealer-prices/bulk-group/", dealer_bulk_group_view, name="dealer-bulk-group"),
    path("dealer-prices/<int:dealer_id>/", dealer_price_update_view, name="dealer-price-update"),
    path("games/<int:game_id>/library-packages/", game_library_packages_view,
         name="game-library-packages"),
    path("library/", library_browse_view, name="library-browse"),
    path("library/<int:library_game_id>/import/", library_import_view, name="library-import"),
    path("product-links/", product_links_view, name="product-links"),
    path("product-links/refresh-prices/", refresh_link_prices_view, name="product-links-refresh"),
] + router.urls
