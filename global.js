import { datasetJson } from "./dataset.js";

const dataset = datasetJson;
let selectedMovie = null;
let similarMovies = [];
let currentPage = 1;
const itemsPerPage = 10;
let filteredMovies = [];

function runTimeToMinutes(run_time) {
  const hoursMatch = run_time.match(/(\d+)h/);
  const minutesMatch = run_time.match(/(\d+)m/);

  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

  return hours * 60 + minutes;
}

function similarityRating(rating1, rating2) {
  return 1 - Math.abs(rating1 - rating2) / 10; // Normalização
}

function similarityGenre(genre1, genre2) {
  const set1 = new Set(genre1.split(",").map((g) => g.trim()));
  const set2 = new Set(genre2.split(",").map((g) => g.trim()));
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  return intersection.size / Math.max(set1.size, set2.size);
}

function similarityDirectors(dir1, dir2) {
  return dir1 === dir2 ? 1 : 0;
}

function similarityCasts(cast1, cast2) {
  const set1 = new Set(cast1.split(",").map((c) => c.trim()));
  const set2 = new Set(cast2.split(",").map((c) => c.trim()));
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  return intersection.size / Math.max(set1.size, set2.size);
}

function similarityRunTime(time1, time2) {
  return time1 && time2 ? 1 - Math.abs(time1 - time2) / Math.max(time1, time2) : 0; // Normalização
}

// Função principal que calcula a similaridade
function calculateSimilarity(input, movie, weights) {
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
function calculateSimilarities(inputMovie, weights) {
  return dataset
    .filter((movie) => movie.rank !== inputMovie.rank)
    .map((movie) => {
      const similarityDetails = calculateSimilarity(inputMovie, movie, weights);
      return {
        ...movie,
        ...similarityDetails,
      };
    })
    .sort((a, b) => b.totalSimilarity - a.totalSimilarity);
}

// Função para preencher o seletor de filmes
function populateMovieSelector() {
  const selector = document.getElementById("movie-selector");

  dataset.forEach((movie) => {
    const option = document.createElement("option");
    option.value = movie.rank;
    option.textContent = movie.name;
    selector.appendChild(option);
  });
}

// Função para mostrar detalhes do filme selecionado
function showMovieDetails(movie) {
  const detailsContainer = document.getElementById("selected-movie-details");
  const nameElement = document.getElementById("selected-movie-name");
  const infoElement = document.getElementById("movie-info");

  nameElement.textContent = movie.name;

  infoElement.innerHTML = "";

  // Adicionar cada detalhe do filme
  const details = [
    { label: "Rank", value: movie.rank },
    { label: "Plataforma", value: movie.platform },
    { label: "Ano", value: movie.year },
    { label: "Gênero", value: movie.genre },
    { label: "Publicadora", value: movie.publisher },
    { label: "Rating", value: movie.rating },
    { label: "Diretores", value: movie.directors },
    { label: "Elenco", value: movie.casts },
    { label: "Duração", value: movie.run_time },
  ];

  details.forEach((detail) => {
    const labelDiv = document.createElement("div");
    labelDiv.className = "label";
    labelDiv.textContent = detail.label + ":";

    const valueDiv = document.createElement("div");
    valueDiv.textContent = detail.value;

    infoElement.appendChild(labelDiv);
    infoElement.appendChild(valueDiv);
  });

  detailsContainer.style.display = "block";
}

// Função para obter os pesos atuais
function getCurrentWeights() {
  return {
    rating: parseFloat(document.getElementById("rating-weight").value),
    genre: parseFloat(document.getElementById("genre-weight").value),
    directors: parseFloat(document.getElementById("directors-weight").value),
    casts: parseFloat(document.getElementById("casts-weight").value),
    run_time: parseFloat(document.getElementById("runtime-weight").value),
  };
}

// Função para renderizar a tabela de similaridade
function renderSimilarityTable() {
  const tableBody = document.getElementById("similarity-table-body");
  tableBody.innerHTML = "";

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const moviesToShow = filteredMovies.slice(startIndex, endIndex);

  moviesToShow.forEach((movie) => {
    const row = document.createElement("tr");

    row.innerHTML = `
                    <td>${movie.rank}</td>
                    <td><strong>${movie.name}</strong></td>
                    <td class="text-right">${movie.ratingSim.toFixed(2)}</td>
                    <td class="text-right">${movie.genreSim.toFixed(2)}</td>
                    <td class="text-right">${movie.directorsSim.toFixed(2)}</td>
                    <td class="text-right">${movie.castsSim.toFixed(2)}</td>
                    <td class="text-right">${movie.runTimeSim.toFixed(2)}</td>
                    <td class="text-right"><strong>${movie.totalSimilarity.toFixed(2)}</strong></td>
                `;

    tableBody.appendChild(row);
  });

  // Atualizar informações de paginação
  updatePagination();
}

// Função para atualizar controles de paginação
function updatePagination() {
  const paginationContainer = document.getElementById("pagination");
  const paginationInfo = document.getElementById("pagination-info");
  const prevButton = document.getElementById("prev-page");
  const nextButton = document.getElementById("next-page");

  const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);

  if (totalPages <= 1) {
    paginationContainer.style.display = "none";
    return;
  }

  paginationContainer.style.display = "flex";
  paginationInfo.textContent = `Página ${currentPage} de ${totalPages}`;

  prevButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage === totalPages;
}

// Função para filtrar a tabela de similaridade
function filterSimilarityTable(searchTerm) {
  filteredMovies = similarMovies.filter((movie) => movie.name.toLowerCase().includes(searchTerm.toLowerCase()));

  currentPage = 1;
  renderSimilarityTable();
}

// Inicialização
document.addEventListener("DOMContentLoaded", function () {
  populateMovieSelector();

  // Event listeners para os sliders de peso
  document.getElementById("rating-weight").addEventListener("input", function () {
    document.getElementById("rating-weight-value").textContent = this.value;
  });

  document.getElementById("genre-weight").addEventListener("input", function () {
    document.getElementById("genre-weight-value").textContent = this.value;
  });

  document.getElementById("directors-weight").addEventListener("input", function () {
    document.getElementById("directors-weight-value").textContent = this.value;
  });

  document.getElementById("casts-weight").addEventListener("input", function () {
    document.getElementById("casts-weight-value").textContent = this.value;
  });

  document.getElementById("runtime-weight").addEventListener("input", function () {
    document.getElementById("runtime-weight-value").textContent = this.value;
  });

  // Event listener para seleção de filme
  document.getElementById("movie-selector").addEventListener("change", function () {
    const selectedRank = parseInt(this.value, 10);
    if (selectedRank) {
      selectedMovie = dataset.find((movie) => movie.rank === selectedRank);
      showMovieDetails(selectedMovie);
    } else {
      document.getElementById("selected-movie-details").style.display = "none";
      selectedMovie = null;
    }
  });

  // Event listener para o botão de calcular
  document.getElementById("calculate-btn").addEventListener("click", function () {
    if (!selectedMovie) {
      alert("Por favor, selecione um filme primeiro.");
      return;
    }

    const weights = getCurrentWeights();
    similarMovies = calculateSimilarities(selectedMovie, weights);
    filteredMovies = [...similarMovies];

    document.getElementById("similarity-title-movie").textContent = selectedMovie.name;
    document.getElementById("similarity-results").style.display = "block";

    currentPage = 1;
    renderSimilarityTable();
  });

  // Event listener para busca
  document.getElementById("search-input").addEventListener("input", function () {
    filterSimilarityTable(this.value);
  });

  // Event listeners para paginação
  document.getElementById("prev-page").addEventListener("click", function () {
    if (currentPage > 1) {
      currentPage--;
      renderSimilarityTable();
    }
  });

  document.getElementById("next-page").addEventListener("click", function () {
    const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderSimilarityTable();
    }
  });
});
