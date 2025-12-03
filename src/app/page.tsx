"use client";

import { useMemo, useState } from "react";
import countriesLib from "world-countries-capitals";

type CountryDetail = {
  country: string;
  capital: string;
  continent: string;
  iso: { numeric: string; alpha_3?: string };
  famous_for?: string;
  is_landlocked: boolean;
  drive_direction?: "left" | "right";
};

type Country = {
  id: string;
  name: string;
  capital: string;
  continent: string;
  continentCode: string;
  isLandlocked: boolean;
  driveDirection: "left" | "right";
  famousFor?: string;
};

type GeoQuestion = {
  prompt: string;
  answer: string;
  options: string[];
};

const CONTINENT_NAMES: Record<string, string> = {
  af: "Africa",
  as: "Asia",
  eu: "Europe",
  na: "North America",
  sa: "South America",
  oc: "Oceania",
  an: "Antarctica",
};

const TOTAL_LEVELS = 100;

const normalizeAnswer = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const titleize = (value: string) =>
  value
    .split(" ")
    .map((part) =>
      part.length > 3
        ? part[0]?.toUpperCase().concat(part.slice(1))
        : part.toUpperCase(),
    )
    .join(" ");

const shuffle = <T,>(array: T[]) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const buildCountries = (): Country[] => {
  const detailList = countriesLib.getAllCountryDetails() as CountryDetail[];
  const detailByIso = new Map<string, CountryDetail>();
  detailList.forEach((detail) => {
    if (!detail?.iso?.numeric) return;
    const numericRaw = detail.iso.numeric;
    const numericTrimmed = String(parseInt(detail.iso.numeric, 10));
    detailByIso.set(numericRaw, detail);
    detailByIso.set(numericTrimmed, detail);
  });

  return detailList
    .map((detail) => {
      if (!detail?.iso?.numeric) return null;
      return {
        id: String(parseInt(detail.iso.numeric, 10)),
        name: titleize(detail.country),
        capital: titleize(detail.capital),
        continent: CONTINENT_NAMES[detail.continent] ?? "Unknown",
        continentCode: detail.continent,
        isLandlocked: Boolean(detail.is_landlocked),
        driveDirection: detail.drive_direction === "left" ? "left" : "right",
        famousFor: detail.famous_for,
      };
    })
    .filter(Boolean) as Country[];
};

const buildGeoQuestion = (country: Country): GeoQuestion => {
  const options: GeoQuestion[] = [
    {
      prompt: `Is ${country.name} landlocked?`,
      answer: country.isLandlocked ? "Yes" : "No",
      options: shuffle(["Yes", "No"]),
    },
    {
      prompt: `Which driving side is used in ${country.name}?`,
      answer: country.driveDirection === "left" ? "Left" : "Right",
      options: shuffle(["Left", "Right"]),
    },
  ];

  return options[Math.floor(Math.random() * options.length)];
};

const buildPool = () => shuffle(buildCountries()).slice(0, TOTAL_LEVELS);

export default function Home() {
  const [countries, setCountries] = useState<Country[]>(buildPool);
  const [levelIndex, setLevelIndex] = useState(0);
  const [step, setStep] = useState<"country" | "capital" | "geo">("country");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const totalLevels = Math.min(TOTAL_LEVELS, countries.length);
  const currentCountry =
    levelIndex < countries.length ? countries[levelIndex] : undefined;
  const finished = totalLevels > 0 && levelIndex >= totalLevels;

  const geoQuestion = useMemo(
    () => (currentCountry ? buildGeoQuestion(currentCountry) : null),
    [currentCountry],
  );

  const handleCorrect = (nextStep?: "capital" | "geo" | "country") => {
    setCorrectCount((prev) => prev + 1);
    setStreak((prev) => prev + 1);
    setFeedback(
      nextStep === "country"
        ? "Level complete! Get ready for the next spotlight."
        : "On point! Keep it going.",
    );
    if (nextStep) {
      setStep(nextStep);
      setAnswer("");
    }
  };

  const handleAdvance = () => {
    if (finished) return;
    setLevelIndex((prev) => prev + 1);
    setStep("country");
    setAnswer("");
    setSelectedOption(null);
    setFeedback("");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentCountry) return;

    const cleaned = normalizeAnswer(answer);
    if (!cleaned) {
      setFeedback("Type your answer to keep moving.");
      return;
    }

    setAttempts((prev) => prev + 1);

    if (step === "country") {
      if (normalizeAnswer(currentCountry.name) === cleaned) {
        handleCorrect("capital");
      } else {
        setFeedback("Not quite. Use the hints and try again.");
        setStreak(0);
      }
      return;
    }

    if (step === "capital") {
      if (normalizeAnswer(currentCountry.capital) === cleaned) {
        handleCorrect("geo");
      } else {
        setFeedback("Close! Think of the capital city.");
        setStreak(0);
      }
      return;
    }
  };

  const handleGeoChoice = (option: string) => {
    if (!geoQuestion) return;
    setSelectedOption(option);
    setAttempts((prev) => prev + 1);
    if (normalizeAnswer(option) === normalizeAnswer(geoQuestion.answer)) {
      handleCorrect("country");
      setTimeout(() => handleAdvance(), 600);
    } else {
      setFeedback("Geography check missed. Try another option.");
      setStreak(0);
    }
  };

  const progressPercent = useMemo(() => {
    if (!totalLevels) return 0;
    const completed = Math.min(levelIndex, totalLevels);
    return Math.round((completed / totalLevels) * 100);
  }, [levelIndex, totalLevels]);

  const hintLine = useMemo(() => {
    if (!currentCountry) return "Loading hint...";
    if (step === "country") {
      const first = currentCountry.name.charAt(0).toUpperCase();
      return `Country starts with ${first} and sits in ${currentCountry.continent}.`;
    }
    if (step === "capital") {
      const first = currentCountry.capital.charAt(0).toUpperCase();
      return `Capital starts with ${first} for ${currentCountry.name}.`;
    }
    if (step === "geo" && geoQuestion) {
      if (geoQuestion.prompt.includes("landlocked")) {
        return currentCountry.isLandlocked ? "No coastline." : "Touches the sea.";
      }
      if (geoQuestion.prompt.includes("driving side")) {
        return `They drive on the ${currentCountry.driveDirection} side.`;
      }
    }
    return "Stay sharp.";
  }, [currentCountry, geoQuestion, step]);

  return (
    <div className="min-h-screen bg-white text-black">
      <main className="mx-auto flex w-full max-w-full flex-col gap-8 px-6 pb-16 pt-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-black/50">
              Countries & Capitals
            </p>
            <h1 className="text-4xl font-semibold sm:text-5xl">
              Countries & Capitals
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-black/70">
              Name the country, its capital, then pass a geography check to clear each spotlighted level.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.15em]">
            <div className="rounded-full border border-black/15 bg-black/5 px-4 py-2">
              Level {Math.min(levelIndex + 1, totalLevels)} / {totalLevels}
            </div>
            <div className="rounded-full border border-black/15 bg-black/5 px-4 py-2">
              Streak {streak}
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[7fr_3fr]">
          <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white">
            <div className="relative flex h-[280px] items-center justify-center p-6 text-center sm:h-[340px]">
              {currentCountry ? (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-black/50">
                    Country spotlight
                  </p>
                  <p className="text-4xl font-semibold sm:text-5xl">
                    Level {Math.min(levelIndex + 1, totalLevels)}
                  </p>
                  <p className="max-w-xl text-sm text-black/70">
                    Globe view is disabled for stability. Use the hints and prompts to clear each
                    level.
                  </p>
                  <p className="text-sm font-medium text-black/80">
                    Continent: {currentCountry.continent}
                  </p>
                </div>
              ) : (
                <div className="text-center text-black/60">Loading level…</div>
              )}
            </div>
            <div className="grid gap-3 border-t border-black/10 px-5 py-4 sm:grid-cols-3">
              <div className="rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-xs">
                <p className="text-black/60">Progress</p>
                <div className="mt-2 h-1 rounded-full bg-black/10">
                  <div
                    className="h-1 rounded-full bg-black"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-1 text-black/80">{progressPercent}%</p>
              </div>
              <div className="rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-xs">
                <p className="text-black/60">Attempts</p>
                <p className="text-lg font-semibold text-black">
                  {attempts} <span className="text-xs text-black/50">checks</span>
                </p>
              </div>
              <div className="rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-xs">
                <p className="text-black/60">Accuracy</p>
                <p className="text-lg font-semibold text-black">
                  {attempts ? Math.round((correctCount / attempts) * 100) : 100}%
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-black/10 bg-black/5 p-5">
              {!finished ? (
                <>
                  <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-black/50">
                    <span>Level {Math.min(levelIndex + 1, totalLevels)}</span>
                    <span>
                      Step:{" "}
                      {step === "country"
                        ? "Country"
                        : step === "capital"
                          ? "Capital"
                          : "Geography"}
                    </span>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <p className="text-sm text-black/80">
                      {step === "country" &&
                        "Guess the country using the clues above and the hint."}
                      {step === "capital" &&
                        `Type the capital city of ${currentCountry?.name}.`}
                    </p>
                    {step !== "geo" && (
                      <input
                        key={step}
                        autoFocus
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder={
                          step === "country" ? "Country name" : "Capital city"
                        }
                        className="w-full rounded-xl border border-black/20 bg-white px-4 py-3 text-sm text-black outline-none ring-1 ring-transparent transition focus:ring-black"
                      />
                    )}
                    {step === "geo" && geoQuestion && (
                      <div className="space-y-3">
                        <p className="text-sm text-black/80">{geoQuestion.prompt}</p>
                        <div className="grid grid-cols-2 gap-3">
                          {geoQuestion.options.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => handleGeoChoice(option)}
                              className={`rounded-xl border px-3 py-3 text-sm transition ${
                                selectedOption === option
                                  ? "border-black bg-black text-white"
                                  : "border-black/20 bg-white text-black hover:border-black/60"
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {step !== "geo" && (
                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-xl border border-black bg-black px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px]"
                        >
                          Check
                        </button>
                        <p className="text-xs text-black/60">
                          Answer all three checks to unlock the next level.
                        </p>
                      </div>
                    )}
                    {feedback && (
                      <div className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-black">
                        {feedback}
                      </div>
                    )}
                  </form>
                </>
              ) : (
                <div className="space-y-4 text-center">
                  <p className="text-sm uppercase tracking-[0.3em] text-black/50">
                    Victory
                  </p>
                  <h2 className="text-2xl font-semibold">
                    {totalLevels} levels cleared!
                  </h2>
                  <p className="text-black/70">
                    You ran through the full gauntlet. Want another shuffle?
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const built = buildPool();
                      setCountries(built);
                      setLevelIndex(0);
                      setStep("country");
                      setAnswer("");
                      setAttempts(0);
                      setCorrectCount(0);
                      setStreak(0);
                      setFeedback("");
                      setSelectedOption(null);
                    }}
                    className="rounded-xl border border-black bg-black px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-[1px]"
                  >
                    Restart with new order
                  </button>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-black/10 bg-black/5 p-5 text-sm text-black/80">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-black/50">
                  Hint
                </p>
                <button
                  type="button"
                  onClick={() => setShowHint((prev) => !prev)}
                  className="rounded-lg border border-black px-3 py-1 text-xs font-semibold text-white bg-black transition hover:-translate-y-[1px]"
                >
                  {showHint ? "Hide hint" : "Show hint"}
                </button>
              </div>
              {showHint && (
                <p className="mt-2 text-sm text-black/80">{hintLine}</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
