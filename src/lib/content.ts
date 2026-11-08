import type { CollectionEntry } from "astro:content";

export const ARCHIVE_DAYS = 90;

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function isOpen(date: Date, now = new Date()) {
  return endOfDay(date).getTime() >= now.getTime();
}

export function isWithinArchive(date: Date, now = new Date()) {
  const archiveStart = new Date(now);
  archiveStart.setDate(archiveStart.getDate() - ARCHIVE_DAYS);
  return endOfDay(date).getTime() >= archiveStart.getTime();
}

export function sortNewest<T extends { data: { postedDate?: Date; startDate?: Date } }>(entries: T[]) {
  return [...entries].sort((a, b) => {
    const aDate = a.data.postedDate ?? a.data.startDate;
    const bDate = b.data.postedDate ?? b.data.startDate;
    return (bDate?.getTime() ?? 0) - (aDate?.getTime() ?? 0);
  });
}

export function activeJobs(entries: CollectionEntry<"jobs">[], now = new Date()) {
  return sortNewest(entries.filter((entry) => isOpen(entry.data.closingDate, now)));
}

export function archivedJobs(entries: CollectionEntry<"jobs">[], now = new Date()) {
  return sortNewest(entries.filter((entry) => !isOpen(entry.data.closingDate, now) && isWithinArchive(entry.data.closingDate, now)));
}

export function activeTenders(entries: CollectionEntry<"tenders">[], now = new Date()) {
  return sortNewest(entries.filter((entry) => isOpen(entry.data.closingDate, now)));
}

export function archivedTenders(entries: CollectionEntry<"tenders">[], now = new Date()) {
  return sortNewest(entries.filter((entry) => !isOpen(entry.data.closingDate, now) && isWithinArchive(entry.data.closingDate, now)));
}

export function activeAnnouncements(entries: CollectionEntry<"announcements">[], now = new Date()) {
  return sortNewest(
    entries.filter(
      (entry) =>
        entry.data.startDate.getTime() <= now.getTime() &&
        isOpen(entry.data.endDate, now),
    ),
  );
}
