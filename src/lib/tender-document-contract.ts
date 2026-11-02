/** Public metadata only. Private files and entered facts never leave the device. */
export const TENDER_FILE_MAX = 3 * 1024 * 1024;
export const TENDER_UNPACKED_MAX = 12 * 1024 * 1024;
export const TENDER_ENTRY_MAX = 2 * 1024 * 1024;
export const TENDER_ENTRY_COUNT_MAX = 256;
export const TENDER_DOCUMENT_TIMEOUT_MS = 8000;
export const VERIFIED_SBD1 = {
  id: 'treasury-revised-sbd1-20261030',
  mappingVersion: 1,
  title: 'National Treasury revised SBD 1',
  sha256: '76094c42d8f098fb0bb51ab922f8ba1a832e1858039107b2dbd14b4c086bf1fe',
  bytes: 56343,
  checkedOn: '2026-10-30',
  source: 'https://ocpo.treasury.gov.za/Buyers_Area/Standard-Bidding-Forms/REVISED%20SBD1.docx',
  directory: 'https://ocpo.treasury.gov.za/Buyers_Area/Standard-Bidding-Forms/',
  localPath: '/forms/tenders/treasury-revised-sbd1.docx',
} as const;
// Exact physical w:tc indices, not Word's expanded grid/merged-cell indices.
export const SBD1_FIELDS = [
  {id:'bidderName', label:'Name of bidder', row:14, cell:1, max:70, required:true},
  {id:'postalAddress', label:'Postal address', row:15, cell:1, max:90, required:false},
  {id:'streetAddress', label:'Street address', row:16, cell:1, max:90, required:false},
  {id:'telephoneCode', label:'Telephone code', row:17, cell:2, max:8, required:false},
  {id:'telephoneNumber', label:'Telephone number', row:17, cell:4, max:24, required:false},
  {id:'cellphone', label:'Cellphone number', row:18, cell:1, max:24, required:false},
  {id:'email', label:'Email address', row:20, cell:1, max:80, required:false},
] as const;
export type SupplierField = typeof SBD1_FIELDS[number]['id'];
export type SupplierValues = Record<SupplierField,string>;
export const EMPTY_SUPPLIER_VALUES: SupplierValues = {
  bidderName:'',postalAddress:'',streetAddress:'',telephoneCode:'',telephoneNumber:'',cellphone:'',email:'',
};
export interface TenderExtractedField { location:string; label:string; value:string }
export interface TenderDocumentInspection {
  kind:'docx'|'xlsx'|'pdf'; sha256:string; size:number;
  templateId:typeof VERIFIED_SBD1.id|null;
  fields:TenderExtractedField[];
  excerpt:string;
  notes:string[];
}
export type TenderDocumentRequest =
  | {action:'inspect';name:string;mime:string;bytes:Uint8Array}
  | {action:'fill';name:string;mime:string;bytes:Uint8Array;values:SupplierValues};
export type TenderDocumentResponse =
  | {ok:true;inspection:TenderDocumentInspection;filled?:Uint8Array}
  | {ok:false;code:string};
export const TENDER_DOCUMENT_ERRORS:Record<string,string> = {
  FILE_SIZE:'Choose a non-empty file up to 3 MB.',
  FILE_TYPE:'Only a PDF, DOCX or XLSX with matching file content is supported. Legacy DOC/XLS and macro files are not supported.',
  ARCHIVE_LIMIT:'The document archive exceeds the safe entry, expansion or compression limits.',
  DOCUMENT_UNSAFE:'This document contains an unsupported active feature, attachment, signature, external connection or unsafe structure. Use an unsigned, clean issuer original.',
  DOCUMENT_INVALID:'The document is malformed or uses an unsupported structure.',
  DOCUMENT_TIMEOUT:'Document processing stopped after 8 seconds. Try a smaller, supported original.',
  MAPPING_UNVERIFIED:'This exact original has no verified fill mapping. Review the extracted data and complete it in the issuer-approved editor.',
  SUPPLIER_VALUES:'Check the entered values and field lengths. Use single-line facts only, with no credentials or invented details.',
  DOCUMENT_UNAVAILABLE:'Document processing is unavailable in this browser. Your file was not uploaded.',
};
