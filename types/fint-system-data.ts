export type FintAdresse = {
  adresselinje: string | null;
  postnummer: string | null;
  poststed: string | null;
};

export type FintArbeidsforhold = {
  aktiv: boolean;
  systemId: string;
  gyldighetsperiode: FintPeriode;
  arbeidsforholdsperiode: FintPeriode;
  hovedstilling: boolean;
  ansettelsesprosent: number;
  lonnsprosent: number;
  stillingsnummer: string;
  stillingstittel: string | null;
  stillingskode: FintKodeRelasjon | null;
  arbeidsforholdstype: FintKodeRelasjon | null;
  ansvar: FintKodeRelasjon | null;
  funksjon: FintKodeRelasjon | null;
  narmesteLeder: FintLeder | null;
  arbeidssted: FintStrukturLinje;
  strukturlinje: FintStrukturLinje[];
};

export type FintArbeidsforholdstype = {
  gyldighetsperiode: FintPeriode;
  kode: string;
  navn: string;
  passiv: boolean | null;
  systemId: {
    identifikatorverdi: string;
  };
};

export type FintBasisgruppe = {
  navn: string;
  systemId: string;
  aktiv: boolean;
  periode: FintPeriode;
  trinn: string;
  skole: FintMiniSkole | null;
  termin: FintTermin[];
  skolear: FintTermin;
  elever: FintElev[];
};

export type FintBasisgruppeMedlemskap = {
  medlemskapgyldighetsperiode: FintPeriode;
  navn: string;
  systemId: string;
  aktiv: boolean;
  periode: FintPeriode;
  trinn: string;
  skole: FintMiniSkole;
  termin: FintTermin[];
  skolear: FintTermin;
  undervisningsforhold: FintLarer[];
};

export type FintElev = {
  navn: string | null;
  fornavn: string | null;
  etternavn: string | null;
  feidenavn: string | null;
  elevnummer: string | null;
  kontaktlarer: boolean;
  fodselsnummer: string | null;
};

export type FintElevforhold = {
  systemId: string;
  aktiv: boolean;
  beskrivelse: string | null;
  avbruddsdato: Date | null;
  gyldighetsperiode: FintPeriode;
  skole: FintSkole | null;
  kategori: FintKodeRelasjon;
  programomrademedlemskap: FintProgramomradeMedlemskap[];
  basisgruppemedlemskap: FintBasisgruppeMedlemskap[];
  undervisningsgruppemedlemskap: FintUndervisningsgruppeMedlemskap[];
  faggruppemedlemskap: FintFaggruppeMedlemskap[];
  kontaktlarergruppemedlemskap: FintKontaktlarergruppeMedlemskap[];
};

export type FintElevUndervisningsforhold = {
  feidenavn: string;
  anattnummer: string;
  kontaktEpostadresse: string;
  navn: string;
  fornavn: string;
  etternavn: string;
  kontaktlarer: boolean;
};

export type FintFag = {
  systemId: {
    identifikatorverdi: string;
  };
  beskrivelse?: string;
  navn: string;
  grepreferanse: string[];
};

export type FintFaggruppeMedlemskap = {
  medlemskapgyldighetsperiode: FintPeriode;
  aktiv: boolean;
  navn: string;
  systemId: string;
  fag: FintFag[];
};

export type FintHovedskole = {
  navn: string;
  skolenummer: string;
};

export type FintKodeRelasjon = {
  kode: string;
  navn: string;
};

export type FintKontaktlarer = FintLarer & {
  gruppe: string;
  skole: FintMiniSkole | null;
};

export type FintKontaktlarergruppe = {
  navn: string;
  systemId: string;
  aktiv: boolean;
  periode: FintPeriode;
  skole: FintMiniSkole | null;
  termin: FintTermin[];
  skolear: FintTermin;
};

export type FintKontaktlarergruppeMedlemskap = Omit<FintBasisgruppeMedlemskap, "trinn">;

export type FintLarer = {
  feidenavn: string;
  ansattnummer: string;
  kontaktEpostadresse: string;
  navn: string;
  fornavn: string;
  etternavn: string;
  kontaktlarer: boolean;
};

export type FintLarerUndervisningsforhold = {
  systemId: string;
  beskrivelse: string | null;
  aktiv: boolean;
  arbeidsforhold: {
    arbeidsforholdstype: FintArbeidsforholdstype;
    gyldighetsperiode: FintPeriode;
    arbeidsforholdsperiode: FintPeriode;
    ansettelsesprosent: number;
    lonnsprosent: number;
  };
  skole: FintSkole | null;
  basisgrupper: FintBasisgruppe[];
  kontaktlarergrupper: FintKontaktlarergruppe[];
  undervisningsgrupper: FintUndervisningsgruppe[];
};

export type FintLeder = {
  ansattnummer: string | null;
  navn: string | null;
  fornavn?: string;
  etternavn?: string;
  kontaktEpostadresse: string | null;
};

export type FintMiniFagGruppe = Omit<FintMiniGruppe, "skole"> & {
  fag: FintFag[];
};

export type FintMiniGruppe = {
  systemId: string;
  navn: string;
  skole: string | undefined;
  checked?: boolean; // used and added only fint-larer/common-tests
};

export type FintMiniSkole = Omit<FintSkole, "kortnavn" | "organisasjonsnummer" | "organisasjonsId">;

export type FintMiniUtdanningsGruppe = Omit<FintMiniGruppe, "skole"> & {
  utdanningsprogram: FintUtdanningsprogram[];
};

export type FintPeriode = {
  beskrivelse: string | null;
  start: string | null;
  slutt: string | null;
  fintStart: string | null;
  fintSlutt: string | null;
  aktiv: boolean;
};

export type FintProgramomradeMedlemskap = {
  medlemskapgyldighetsperiode: FintPeriode;
  aktiv: boolean;
  navn: string;
  systemId: string;
  grepreferanse: string[];
  utdanningsprogram: FintUtdanningsprogram[];
};

export type FintSkole = {
  navn: string;
  kortnavn: string | null;
  skolenummer: string;
  organisasjonsnummer: string | null;
  organisasjonsId: string | null;
  hovedskole: boolean;
};

export type FintStrukturLinje = {
  kortnavn: string | null;
  navn: string | null;
  organisasjonsId: string;
  organisasjonsKode: string;
  leder: FintLeder;
};

export type FintTermin = {
  kode: string;
  gyldighetsperiode: FintPeriode;
  navn: string;
  passiv: boolean | null;
  systemId: {
    identifikatorverdi: string;
  };
};

export type FintUndervisningsgruppe = {
  navn: string;
  systemId: string;
  aktiv: boolean;
  fag: FintFag[];
  periode: FintPeriode;
  skole: FintMiniSkole | null;
  termin: FintTermin[];
  skolear: FintTermin;
  elever: FintElev[];
};

export type FintUndervisningsgruppeMedlemskap = {
  medlemskapgyldighetsperiode: FintPeriode;
  navn: string;
  systemId: string;
  aktiv: boolean;
  fag: FintFag[];
  periode: FintPeriode;
  skole: FintMiniSkole | null;
  termin: FintTermin[];
  skolear: FintTermin;
  undervisningsforhold: FintElevUndervisningsforhold[];
};

export type FintUtdanningsprogram = {
  systemId: {
    identifikatorverdi: string;
  };
  navn: string;
  grepreferanse: string[];
};

export type FintAnsattSystemData = {
  ansattnummer: string;
  upn: string;
  aktiv: boolean;
  navn: string | null;
  fornavn: string | null;
  etternavn: string | null;
  fodselsnummer: string;
  fodselsdato: string;
  alder: number | null;
  kjonn: string | null;
  privatEpostadresse: string;
  privatMobiltelefonnummer: string;
  brukernavn: string;
  kontaktEpostadresse: string;
  kontaktMobiltelefonnummer: string;
  bostedsadresse: FintAdresse | null | undefined;
  entraIdOfficeLocation: string;
  ansiennitet: Date | null;
  ansettelsesperiode: FintPeriode;
  personalressurskategori: FintKodeRelasjon;
  arbeidsforhold: FintArbeidsforhold[];
  fullmakter: unknown[];
};

export type FintElevSystemData = {
  feidenavn: string | null;
  elevnummer: string | null;
  upn: string | null;
  navn: string | null;
  fornavn: string | null;
  etternavn: string | null;
  fodselsnummer: string | null;
  fodselsdato: string | null;
  alder: number | null;
  kjonn: string | null;
  kontaktEpostadresse: string | null;
  kontaktMobiltelefonnummer: string | null;
  privatEpostadresse: string | null;
  privatMobiltelefonnummer: string | null;
  bostedsadresse: FintAdresse | null | undefined;
  hybeladresse: FintAdresse | null | undefined;
  hovedskole: FintHovedskole | null;
  kontaktlarere: FintKontaktlarer[];
  elevforhold: FintElevforhold[];
};

export type FintLarerSystemData = {
  feidenavn: string | null;
  ansattnummer: string | null;
  upn: string | null;
  navn: string | null;
  fornavn: string | null;
  etternavn: string | null;
  fodselsnummer: string | null;
  fodselsdato: string | null;
  alder: number | null;
  kjonn: string | null;
  larerEpostadresse: string | null;
  larerMobiltelefonnummer: string | null;
  kontaktEpostadresse: string | null;
  kontaktMobiltelefonnummer: string | null;
  privatEpostadresse: string | null;
  privatMobiltelefonnummer: string | null;
  bostedsadresse: FintAdresse | null | undefined;
  azureOfficeLocation: string | null;
  hovedskole: FintHovedskole | null;
  undervisningsforhold: FintLarerUndervisningsforhold[];
};
