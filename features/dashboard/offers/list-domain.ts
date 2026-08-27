import type { ServiceCity } from "../cities/types";
import { offerDateLifecycle, type OfferCard } from "./domain";

export const allOffersFilterValue = "all";
const generalOffersFilterValue = "general";

export function translateOfferErrorMessage(message: string) {
  if (/cannot delete offer while orders are using it/i.test(message.trim())) {
    return "لا يمكن حذف العرض لأنه مستخدم في طلبات حالية.";
  }
  return message;
}

function normalizeOfferFilterText(value: string) {
  return value.trim().toLowerCase();
}

export function offerCityOptions(cities: ServiceCity[]) {
  return [
    { value: allOffersFilterValue, label: "كل المدن" },
    { value: generalOffersFilterValue, label: "جاهز للشحن" },
    ...cities
      .filter((city) => city.is_active !== false)
      .map((city) => ({ value: String(city.id), label: city.name })),
  ];
}

export function filterOffers(
  offers: OfferCard[],
  searchValue: string,
  typeFilter: string,
  cityFilter: string,
) {
  const search = normalizeOfferFilterText(searchValue);
  return offers.filter((offer) => {
    const matchesSearch = !search || [
      offer.id,
      offer.title,
      offer.description,
      offer.type,
      offer.marketName,
      offer.serviceCityName,
      offer.status,
    ].some((value) => normalizeOfferFilterText(value).includes(search));
    const matchesType = typeFilter === allOffersFilterValue || offer.apiType === typeFilter;
    const matchesCity = cityFilter === allOffersFilterValue ||
      (cityFilter === generalOffersFilterValue
        ? offer.showInGeneral
        : offer.serviceCityIds.includes(cityFilter));
    return matchesSearch && matchesType && matchesCity;
  });
}

export function offerListStats(offers: OfferCard[], now = Date.now()) {
  return {
    active: offers.filter((offer) =>
      offer.backendStatus === "active" &&
      offerDateLifecycle(offer.startsAt, offer.endsAt, now) === "current",
    ).length,
    scheduled: offers.filter((offer) =>
      offer.backendStatus === "active" &&
      offerDateLifecycle(offer.startsAt, offer.endsAt, now) === "scheduled",
    ).length,
    expired: offers.filter((offer) =>
      offerDateLifecycle(offer.startsAt, offer.endsAt, now) === "expired",
    ).length,
  };
}
