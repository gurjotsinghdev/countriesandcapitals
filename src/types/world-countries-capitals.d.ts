declare module "world-countries-capitals" {
  export type CountryDetail = {
    country: string;
    capital: string;
    continent: string;
    famous_for?: string;
    drive_direction?: "left" | "right";
    is_landlocked?: boolean;
    iso: {
      numeric: string;
      alpha_2?: string;
      alpha_3?: string;
    };
  };

  interface CountriesLib {
    getAllCountryDetails(): CountryDetail[];
  }

  const countries: CountriesLib;
  export default countries;
}
