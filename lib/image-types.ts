export type ImageRecord = {
  id: string;
  clientId: string;
  appointmentId: string | null;
  kind: string;
  prepForVisit: boolean;
  caption: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
};
