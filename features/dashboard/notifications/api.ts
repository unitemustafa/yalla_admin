import { apiResponseData } from "@/features/dashboard/users/api-users";
import { notificationsFromApi } from "./domain";
import type {
  NotificationFilter,
  NotificationRecord,
} from "./types";

type ApiFetch = (path: string, init?: RequestInit) => Promise<Response>;

const filterPaths: Record<NotificationFilter, string> = {
  all: "notifications/",
  unread: "notifications/?unread=true",
  read: "notifications/?unread=false",
};

export async function loadNotificationsRequest(
  apiFetch: ApiFetch,
  filter: NotificationFilter,
  fallback: string,
) {
  const response = await apiFetch(filterPaths[filter]);
  const data = await apiResponseData(response);
  if (!response.ok) throw new Error(fallback);
  return notificationsFromApi(data);
}

export async function markNotificationReadRequest(
  apiFetch: ApiFetch,
  notificationId: string,
  fallback: string,
) {
  const response = await apiFetch(`notifications/${notificationId}/read/`, {
    method: "PATCH",
  });
  await apiResponseData(response);
  if (!response.ok) throw new Error(fallback);
}

export async function markAllNotificationsReadRequest(
  apiFetch: ApiFetch,
  fallback: string,
) {
  const response = await apiFetch("notifications/mark-all-read/", {
    method: "POST",
  });
  await apiResponseData(response);
  if (!response.ok) throw new Error(fallback);
}

export async function deleteNotificationRequest(
  apiFetch: ApiFetch,
  notificationId: string,
  fallback: string,
  protectedFallback: string,
) {
  const response = await apiFetch(`notifications/${notificationId}/`, {
    method: "DELETE",
  });
  const data = response.status === 204 ? null : await apiResponseData(response);
  if (!response.ok) {
    if (response.status === 409) throw new Error(protectedFallback);
    void data;
    throw new Error(fallback);
  }
}

export async function clearReadNotificationsRequest(
  apiFetch: ApiFetch,
  fallback: string,
) {
  const response = await apiFetch("notifications/clear-read/", {
    method: "DELETE",
  });
  const data = await apiResponseData(response);
  if (!response.ok) throw new Error(fallback);
  return data as NotificationRecord;
}
