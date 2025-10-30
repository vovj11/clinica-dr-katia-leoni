const urls = {
  itens:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAdXYx0JnjcUX8ySPoc1kfKMHbNa8-fDJ15sFgACRvCVScvuudbhs4gggjQp-ygd2rBqhixCqRKVxm/pub?gid=0&single=true&output=csv",
  config:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAdXYx0JnjcUX8ySPoc1kfKMHbNa8-fDJ15sFgACRvCVScvuudbhs4gggjQp-ygd2rBqhixCqRKVxm/pub?gid=1924474484&single=true&output=csv",
  categorias:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAdXYx0JnjcUX8ySPoc1kfKMHbNa8-fDJ15sFgACRvCVScvuudbhs4gggjQp-ygd2rBqhixCqRKVxm/pub?gid=1795591214&single=true&output=csv",
};

// 🌟 NOVO: Caminho base para imagens locais
const LOCAL_IMAGE_PATH = "./imagens_produtos/";

let carrinho = [];
let config = {};
let todosProdutos = [];
let categorias = [];

async function fetchSheetAsJson(url) {
  const res = await fetch(url);
  const csv = await res.text();

  const parsed = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data;
}

async function loadCatalogData() {
  const [itens, configArr, categoriasSheet] = await Promise.all([
    fetchSheetAsJson(urls.itens),
    fetchSheetAsJson(urls.config),
    fetchSheetAsJson(urls.categorias),
  ]);

  configArr.forEach((entry) => {
    const chave = entry.chave || entry.Campo;
    const valor = entry.valor || entry.Valor;
    config[chave] = valor;
  });

  todosProdutos = itens.filter(
    (p) => p.status?.toLowerCase().trim() === "ativo"
  );

  categorias = categoriasSheet.filter((cat) =>
    todosProdutos.some((p) => p.categoria_nome === cat.nome)
  );
  renderCategorias(categorias);
  renderCatalog(todosProdutos, categorias);
  document.getElementById("loader").style.display = "none";

  const statusLoja = document.getElementById("status-loja");
  statusLoja.textContent = config.status_loja;
  statusLoja.style.backgroundColor =
    config.status_loja === "Aberto" ? "#22c55e" : "#ef4444";
  populatePaymentMethods(config.formas_pagamento);
  applyStyles();
}

/**
 * Verifica se a imagem é um link HTTP/HTTPS ou se é um nome de arquivo local.
 * @param {object} produto - Objeto do produto.
 * @returns {string | null} - O src completo da imagem ou null.
 */
function getImageSource(produto) {
  const imageUrl = produto.imagem_url ? produto.imagem_url.trim() : "";

  if (!imageUrl) {
    return null; // Não há imagem
  }

  // 1. Verifica se é uma URL externa completa (começa com http/https)
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  // 2. É um caminho relativo que já começa com './'? (Ex: './img/servicos/foto.jpg')
  // Usamos o valor da planilha diretamente.
  if (imageUrl.startsWith("./") || imageUrl.startsWith("../")) {
    return imageUrl;
  }

  // 3. Assume que é um nome de arquivo local (ex: "produto_x.jpg")
  // e monta o caminho completo.
  return LOCAL_IMAGE_PATH + imageUrl;
}

function renderCatalog(produtos, categorias) {
  const catalogo = document.getElementById("catalogo");
  catalogo.innerHTML = "";

  const categoriesSorted = [...categorias.sort((a, b) => a.sort - b.sort)];

  categoriesSorted.forEach((cat) => {
    const grupo = document.createElement("section");
    grupo.className = "mb-8";
    grupo.id = `categoria-${cat.nome.replace(/\s+/g, "-").toLowerCase()}`;

    const titulo = document.createElement("h2");
    titulo.textContent = cat.nome;
    titulo.className = "text-xl font-bold mb-4 border-b pb-1";
    titulo.style.color = config.cor_primaria || "#2563eb";
    titulo.style.borderBottomColor = config.cor_primaria || "#2563eb";
    grupo.appendChild(titulo);

    const grid = document.createElement("div");
    grid.className =
      "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4";

    produtos
      .filter((p) => p.categoria_nome === cat.nome)
      .forEach((produto) => {
        const card = document.createElement("div");
        card.className =
          "bg-white p-5 shadow-md rounded-xl flex flex-col justify-between hover:shadow-xl transition";

        // 🌟 NOVO: Lógica Condicional
        const isSpecialProduct =
          produto.nome === "Preciso de ajuda para saber qual a melhor terapia";

        // 🌟 NOVO: Determina o HTML do preço
        let precoHtml = "";
        if (!isSpecialProduct) {
          const possuiComplementoComPreco = parseComplementos(produto).some(
            (c) =>
              c.complementos.some(
                (item) => item.preco && parseFloat(item.preco) > 0
              )
          );

          precoHtml = `
            <div class="text-[${
              config.cor_primaria || "#2563eb"
            }] font-bold text-lg leading-tight">
              ${
                possuiComplementoComPreco
                  ? `<p class="text-xs font-normal text-gray-500 leading-none">A partir de</p>`
                  : ""
              }
              <p class="text-lg">R$ ${produto.preco}</p>
            </div>
          `;
        }

        // 🌟 NOVO: Determina o texto do botão
        const buttonText = isSpecialProduct ? "Mais Informações" : "Selecionar";
        const imageUrl = getImageSource(produto);

        card.innerHTML = `
        <div>
          ${
            imageUrl
              ? `<img src="${imageUrl}" alt="${produto.nome}" class="w-full h-56 object-cover rounded-lg mb-3" onerror="this.style.display='none'" />`
              : ""
          }
          <h3 class="text-lg font-semibold mb-1 text-[${
            config.cor_primaria || "#2563eb"
          }]">${produto.nome}</h3>
          <p class="text-sm text-gray-600 line-clamp-2" title="${
            produto.descricao
          }">${produto.descricao}</p>
        </div>
        <div class="mt-4">
          ${precoHtml} <button onclick='abrirModalProduto(${JSON.stringify(
          produto
        )})' class="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-full transition flex items-center justify-center gap-2 btn-card">
            <i class='ph ph-plus'></i> ${buttonText} </button>
        </div>
      `;

        grid.appendChild(card);
      });

    grupo.appendChild(grid);
    catalogo.appendChild(grupo);

    const endereco = document.getElementById("endereco");
    if (config.endereco && config.endereco.trim() !== "") {
      endereco.innerHTML = `<p class="text-sm text-[${config.cor_nome_loja}]"><i class="ph ph-map-pin ph-bold"></i> ${config.endereco}</p>`;
    }
  });
}

function parseComplementos(produto) {
  if (!produto.complementos) return [];

  return produto.complementos
    .split("||")
    .map((bloco) => {
      const [rawCat, itensRaw] = bloco.split(">");
      if (!rawCat || !itensRaw) return null;

      // Detecta obrigatoriedade (*) e limite (número)
      const catMatch = rawCat.match(/^(.+?)(\*(\d*)?)?$/);
      const nomeCategoria = catMatch[1].trim();
      const obrigatorio = !!catMatch[2]; // se existe '*'
      const maximo = catMatch[3] ? parseInt(catMatch[3]) : null; // pode ser null

      const complementos = itensRaw.split("|").map((entry) => {
        const [nome, preco] = entry.split(":");
        return {
          nome: nome.trim(),
          preco: parseFloat(preco || 0),
          selecionado: false,
        };
      });

      return { categoria: nomeCategoria, obrigatorio, maximo, complementos };
    })
    .filter(Boolean);
}

function renderCategorias(categorias) {
  const container = document.getElementById("categorias");
  container.innerHTML = "";
  const categoriesSorted = [...categorias.sort((a, b) => a.sort - b.sort)];

  categoriesSorted.forEach((cat) => {
    const badge = document.createElement("button");
    badge.textContent = cat.nome;
    badge.className =
      "px-3 py-1 text-sm rounded-full border border-gray-300 bg-white hover:bg-gray-100 transition-all";

    badge.onclick = () => {
      const targetId = `categoria-${cat.nome
        .replace(/\s+/g, "-")
        .toLowerCase()}`;
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        const offset = document.getElementById("categorias").offsetHeight || 60;
        const top =
          targetElement.getBoundingClientRect().top +
          window.scrollY -
          offset -
          16;
        window.scrollTo({ top, behavior: "smooth" });
      }
    };

    container.appendChild(badge);
  });
}

function populatePaymentMethods(str) {
  const select = document.getElementById("cliente_pagamento");
  if (!select || !str) return;

  const opcoes = str
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  opcoes.forEach((opcao) => {
    const option = document.createElement("option");
    option.value = opcao.toLowerCase();
    option.textContent = opcao;
    select.appendChild(option);
  });
}

function applyStyles() {
  // 🧱 Cores principais do tema
  const primary = config.cor_primaria || "#2563eb";
  const secondary = config.cor_secundaria || "#1e40af";
  const textButton = config.cor_texto_botao || "#ffffff";
  const background = config.cor_fundo || "#f3f4f6";
  const textColor = config.cor_texto || "#111827";

  // 🎨 Aplicar cores globais
  document.documentElement.style.setProperty("--cor-primaria", primary);
  document.documentElement.style.setProperty("--cor-secundaria", secondary);
  document.documentElement.style.setProperty("--cor-texto-botao", textButton);

  document.body.style.backgroundColor = background;
  document.body.style.color = textColor;

  // 🛒 Estilo do botão de carrinho
  const btnCarrinho = document.getElementById("btn-carrinho");
  btnCarrinho.style.backgroundColor = primary || "#2563eb";
  btnCarrinho.style.color = textButton || "#ffffff";

  // 🔍 Estilo do campo de busca
  const searchInput = document.getElementById("searchInput");
  searchInput.style.borderColor = primary;
  searchInput.onbeforeinput = () => {
    searchInput.style.borderColor = primary;
  };

  // 🏪 Nome e descrição da loja
  const header = document.getElementById("header");
  const info = document.getElementById("info");
  header.textContent = config.nome_loja;
  header.style.color = config.cor_nome_loja || primary;
  info.textContent = config.descricao_loja || "";
  info.style.color = config.cor_descricao_loja || primary;

  // 🖼️ Logo
  const logo = document.getElementById("logo");
  if (!config.logo_url || config.logo_url.trim() === "") {
    logo.style.display = "none";
  } else {
    logo.src = config.logo_url;
    logo.style.display = "block";
    logo.style.borderColor = config.cor_nome_loja;
    logo.onerror = () => (logo.style.display = "none");
  }

  // 🖼️ Banner + Fallback
  const banner = document.getElementById("banner");
  const fallback = document.getElementById("hero-fallback");

  if (!config.banner_url || config.banner_url.trim() === "") {
    banner.style.display = "none";
    fallback.style.display = "flex";
    fallback.style.backgroundColor = primary;
  } else {
    banner.src = config.banner_url;
    banner.style.display = "block";
    fallback.style.display = "none";
    banner.onerror = () => {
      banner.style.display = "none";
      fallback.style.display = "flex";
      fallback.style.backgroundColor = background;
    };
  }

  // 🛍️ Botões de produto
  const btnsCard = document.getElementsByClassName("btn-card");
  Array.from(btnsCard).forEach((btn) => {
    btn.style.backgroundColor = primary;
    btn.style.color = textButton;
  });

  // 🏷️ Categorias
  const categoriaButtons = document.querySelectorAll("#categorias button");
  categoriaButtons.forEach((btn) => {
    btn.style.backgroundColor = "#fff";
    btn.style.color = primary;
    btn.style.borderColor = primary;
  });
}

let debounceTimer;

function filtrarProdutos() {
  const termo = document.getElementById("searchInput").value.toLowerCase();
  const filtrados = todosProdutos.filter(
    (p) =>
      p.nome.toLowerCase().includes(termo) ||
      p.descricao.toLowerCase().includes(termo)
  );
  const categoriasFiltradas = categorias.filter((c) =>
    filtrados.some((p) => p.categoria_nome === c.nome)
  );
  renderCatalog(filtrados, categoriasFiltradas);
  applyStyles();

  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    setupCategoriaStickyObserver();
    setupCategoriaHighlightOnScroll();
  }, 800);
}

function showToast(message, bgColor = config.cor_primaria || "#2563eb") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.style.backgroundColor = bgColor;
  toast.textContent = message;

  const container = document.getElementById("toast-container");
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function setupCategoriaStickyObserver() {
  const categoriasBar = document.getElementById("categorias");

  const sentinel = document.createElement("div");
  sentinel.style.height = "1px";
  categoriasBar.parentNode.insertBefore(sentinel, categoriasBar);

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) {
        categoriasBar.classList.add("bg-white", "shadow-md");
      } else {
        categoriasBar.classList.remove("bg-white", "shadow-md");
      }
    },
    {
      root: null,
      threshold: 0,
    }
  );

  observer.observe(sentinel);
}

function setupCategoriaHighlightOnScroll() {
  const sectionTitles = document.querySelectorAll("#catalogo h2");
  const categoriaButtons = document.querySelectorAll("#categorias button");

  const corAtiva = config.cor_primaria || "#2563eb";
  const corTexto = config.cor_texto_botao || "#ffffff";
  const corInativa = "#ffffff";
  const corTextoInativo = config.cor_primaria || "#2563eb";

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const categoriaAtiva =
            entry.target.textContent || "Todas as categorias";

          categoriaButtons.forEach((btn) => {
            const isAtiva = btn.textContent === categoriaAtiva;
            btn.style.backgroundColor = isAtiva ? corAtiva : corInativa;
            btn.style.color = isAtiva ? corTexto : corTextoInativo;
            btn.style.borderColor = isAtiva ? corAtiva : corTextoInativo;

            // 👇 Se estiver ativa, scroll para mostrar o botão na barra
            if (isAtiva) {
              btn.scrollIntoView({
                behavior: "smooth",
                inline: "center",
                block: "nearest",
              });
            }
          });
        }
      });
    },
    {
      root: null,
      rootMargin: "0px 0px -40% 0px",
      threshold: 0.1,
    }
  );

  sectionTitles.forEach((title) => observer.observe(title));

  const topoSentinela = document.getElementById("topo-sentinela");
  if (topoSentinela) observer.observe(topoSentinela);
}

function applyModalStyles() {
  const stepIndicator = document.getElementById("etapa-indicador");
  const cardTitle = document.getElementById("cart-title");
  const totalElement = document.getElementById("total");
  const obsLabel = document.getElementById("obs-label");
  const step2H2 = document.getElementById("step-2").querySelector("h2");
  const inputRadio = document.querySelectorAll("#input-radio");
  const btnAvancar = document.getElementById("btn-avancar");
  const btnConfirmarComplementos = document.getElementById(
    "btn-confirmar-complementos"
  );

  stepIndicator.style.color = config.cor_primaria || "#2563eb";
  cardTitle.style.color = config.cor_primaria || "#2563eb";
  totalElement.style.color = config.cor_primaria || "#2563eb";
  obsLabel.style.color = config.cor_primaria || "#2563eb";
  step2H2.style.color = config.cor_primaria || "#2563eb";
  inputRadio.forEach((input) => {
    input.style.accentColor = config.cor_primaria || "#2563eb";
  });
  btnAvancar.style.backgroundColor = config.cor_primaria || "#2563eb";
  btnAvancar.style.color = config.cor_texto || "#fff";
  btnConfirmarComplementos.style.backgroundColor =
    config.cor_primaria || "#2563eb";
  btnConfirmarComplementos.style.color = config.cor_texto || "#fff";
}

document.addEventListener("scroll", () => {
  const scrollPosition = window.scrollY;
  const btnVoltarTopo = document.getElementById("btn-voltar-topo");
  btnVoltarTopo.style.backgroundColor = config.cor_primaria || "#2563eb";
  btnVoltarTopo.style.color = config.corSecundaria || "#fff";

  if (scrollPosition > 100) {
    btnVoltarTopo.classList.remove("hidden");
  } else {
    btnVoltarTopo.classList.add("hidden");
  }
});

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

loadCatalogData().then(() => {
  setupCategoriaStickyObserver();
  setupCategoriaHighlightOnScroll();
  applyModalStyles();
});
