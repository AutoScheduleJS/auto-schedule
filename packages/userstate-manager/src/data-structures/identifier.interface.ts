export interface IIdentifier {
  query: string;
  potential?: string;
  material?: string;
  split?: string;
  place?: string;
  [key: string]: string | undefined;
}