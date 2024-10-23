import { datasetJson } from "./dataset.js";

const dataset = datasetJson;

// Pesos
const weights = {
  rating: 1.2,
  genre: 1.4,
  directors: 1.1,
  casts: 1.2,
  run_time: 1.1,
};

function runTimeToMinutes(run_time) {
  const hoursMatch = run_time.match(/(\d+)h/);
  const minutesMatch = run_time.match(/(\d+)m/);

  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

  return hours * 60 + minutes;
}

// Funções de similaridade
function similarityRating(rating1, rating2) {
  return 1 - Math.abs(rating1 - rating2) / 10; // Normalização
}

function similarityGenre(genre1, genre2) {
  const set1 = new Set(genre1.split(","));
  const set2 = new Set(genre2.split(","));
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  return intersection.size / Math.max(set1.size, set2.size);
}

function similarityDirectors(dir1, dir2) {
  return dir1 === dir2 ? 1 : 0;
}

function similarityCasts(cast1, cast2) {
  const set1 = new Set(cast1.split(","));
  const set2 = new Set(cast2.split(","));
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  return intersection.size / Math.max(set1.size, set2.size);
}

function similarityRunTime(time1, time2) {
  return time1 && time2 ? 1 - Math.abs(time1 - time2) / Math.max(time1, time2) : 0; // Normalização
}

// Função principal que calcula a similaridade e exibe as contas
function calculateSimilarity(input, movie) {
  const ratingSim = similarityRating(input.rating, movie.rating);
  const genreSim = similarityGenre(input.genre, movie.genre);
  const directorsSim = similarityDirectors(input.directors, movie.directors);
  const castsSim = similarityCasts(input.casts, movie.casts);

  // Converte run_time para minutos antes de calcular similaridade
  const inputRunTime = runTimeToMinutes(input.run_time);
  const movieRunTime = runTimeToMinutes(movie.run_time);
  const runTimeSim = similarityRunTime(inputRunTime, movieRunTime);

  const totalWeight = weights.rating + weights.genre + weights.directors + weights.casts + weights.run_time;

  const totalSimilarity =
    (ratingSim * weights.rating +
      genreSim * weights.genre +
      directorsSim * weights.directors +
      castsSim * weights.casts +
      runTimeSim * weights.run_time) /
    totalWeight;

  return {
    ratingSim,
    genreSim,
    directorsSim,
    castsSim,
    runTimeSim,
    totalSimilarity,
  };
}

// Função para encontrar similaridade com todos os filmes, exceto o próprio filme de entrada
function findMostSimilarMovies(inputMovie) {
  return dataset
    .filter((movie) => movie.rank !== inputMovie.rank) // Remove o filme de entrada
    .map((movie) => {
      const similarityDetails = calculateSimilarity(inputMovie, movie);
      return {
        ...movie,
        ...similarityDetails,
      };
    })
    .sort((a, b) => b.totalSimilarity - a.totalSimilarity);
}

// Função para buscar um filme pelo rank
function findMovieByRank(rank) {
  return dataset.find((movie) => movie.rank === rank);
}

const inputRank = 2;
const inputMovie = findMovieByRank(inputRank);

if (inputMovie) {
  const similarMovies = findMostSimilarMovies(inputMovie);

  const top50Movies = similarMovies.slice(0, 50);

  console.log("Filme de entrada:", inputMovie);
  console.log("\nTop 50 filmes ordenados por similaridade:");
  top50Movies.forEach((movie) => {
    console.log(`\nFilme: ${movie.name}`);
    console.log(`  Similaridade de Rating: ${(movie.ratingSim * 100).toFixed(2)}%`);
    console.log(`  Similaridade de Gênero: ${(movie.genreSim * 100).toFixed(2)}%`);
    console.log(`  Similaridade de Diretores: ${(movie.directorsSim * 100).toFixed(2)}%`);
    console.log(`  Similaridade de Elenco: ${(movie.castsSim * 100).toFixed(2)}%`);
    console.log(`  Similaridade de Tempo: ${(movie.runTimeSim * 100).toFixed(2)}%`);
    console.log(`  Similaridade Total: ${(movie.totalSimilarity * 100).toFixed(2)}%`);
  });
} else {
  console.log(`Nenhum filme encontrado com o rank ${inputRank}`);
}
