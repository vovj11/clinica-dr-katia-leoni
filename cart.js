// ✅ Controle de etapas do modal
let etapaAtual = 1;
const totalEtapas = 2;

function atualizarEtapa(novaEtapa) {
  etapaAtual = novaEtapa;
  document
    .getElementById("step-1")
    .classList.toggle("hidden", etapaAtual !== 1);
  document
    .getElementById("step-2")
    .classList.toggle("hidden", etapaAtual !== 2);
  document.getElementById(
    "etapa-indicador"
  ).textContent = `Etapa ${etapaAtual} de ${totalEtapas}`;

  const corPrimaria = config.cor_primaria || "#2563eb";
  const corTextoBotao = config.cor_texto_botao || "#ffffff";

  if (etapaAtual === 1) {
    const btnAvancar = document.getElementById("btn-avancar");
    btnAvancar.style.backgroundColor = corPrimaria;
    btnAvancar.style.color = corTextoBotao;
  } else if (etapaAtual === 2) {
    const btnEnviar = document.getElementById("btn-enviar");
    btnEnviar.style.backgroundColor = corPrimaria;
    btnEnviar.style.color = corTextoBotao;
  }
}

function avancarEtapa() {
  if (etapaAtual === 1 && validarEtapa1()) {
    atualizarEtapa(2);
  }
}

function voltarEtapa() {
  if (etapaAtual > 1) atualizarEtapa(1);
}

function marcarCampoInvalido(id) {
  document.getElementById(id).classList.add("border-red-500");
}

function limparCampoInvalido(id) {
  document.getElementById(id).classList.remove("border-red-500");
}

function validarEtapa1() {
  // if (carrinho.length === 0) {
  //   showToast("O carrinho está vazio.");
  //   return false;
  // }
  return true;
}

function validarEtapa2() {
  const nome = document.getElementById("cliente_nome").value.trim();
  const atendimento = document.querySelector(
    'input[name="atendimento"]:checked'
  ).value;
  const endereco = document.getElementById("cliente_endereco").value.trim();
  const pagamento = document.getElementById("cliente_pagamento").value.trim();
  const troco = document.getElementById("cliente_troco").value.trim();
  const total = calcularValorTotal();

  [
    "cliente_nome",
    "cliente_endereco",
    "cliente_pagamento",
    "cliente_troco",
  ].forEach(limparCampoInvalido);

  if (!nome) {
    marcarCampoInvalido("cliente_nome");
    showToast("Informe seu nome.");
    return false;
  }

  // if (atendimento === "entregar" && !endereco) {
  //   marcarCampoInvalido("cliente_endereco");
  //   showToast("Informe o endereço para entrega.");
  //   return false;
  // }

  if (!pagamento) {
    marcarCampoInvalido("cliente_pagamento");
    showToast("Informe a forma de pagamento.");
    return false;
  }

  if (
    pagamento.toLowerCase() === "dinheiro" &&
    troco &&
    parseFloat(troco) <= total
  ) {
    marcarCampoInvalido("cliente_troco");
    showToast("Informe um valor válido para troco.");
    return false;
  }

  return true;
}

// ✅ Modal de complementos
let produtoSelecionado = null;

function abrirModalProduto(produto) {
  const temComplementos =
    produto.complementos && produto.complementos.includes(">");

  if (temComplementos) {
    produtoSelecionado = {
      ...produto,
      quantidade: 1,
      complementosPorCategoria: parseComplementos(produto),
    };
    abrirModalComplementos(produtoSelecionado);
  } else {
    const itemCarrinho = {
      ...produto,
      quantidade: 1,
      complementosPorCategoria: [],
    };
    carrinho.push(itemCarrinho);
    atualizarCarrinho();
    showToast(`${produto.nome} adicionado as solicitações`);
  }
}

function abrirModalComplementos(prod) {
  const lista = document.getElementById("complemento-lista");
  lista.innerHTML = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.body.style.overflow = "hidden";

  prod.complementosPorCategoria.forEach((cat, ci) => {
    const bloco = document.createElement("div");
    bloco.className = "border p-3 rounded mb-3";

    const isRadio = cat.maximo === 1;
    console.log(cat);
    bloco.innerHTML = `
      <p class="font-semibold mb-1">
        ${cat.categoria}${
      cat.obrigatorio
        ? ' <span class="text-red-500">*</span> <span class="text-gray-500">(obrigatório)'
        : ' <span class="text-gray-500">(opcional)'
    }
        ${
          cat.maximo && cat.maximo > 1
            ? `<small>(máx. ${cat.maximo})</small>`
            : ""
        }
      </p>
      ${cat.complementos
        .map(
          (c, i) => `
        <label class="flex items-center gap-2 text-sm mt-1">
          <input type="${isRadio ? "radio" : "checkbox"}"
                 name="cat-${ci}"
                 onchange="handleSelect(${ci}, ${i})">
          ${c.nome}${c.preco ? ` (+R$ ${c.preco.toFixed(2)})` : ""}
        </label>`
        )
        .join("")}
    `;
    lista.appendChild(bloco);
  });

  document.getElementById("modal-complementos").classList.remove("hidden");
}

function handleSelect(ci, i) {
  const cat = produtoSelecionado.complementosPorCategoria[ci];
  const compl = cat.complementos[i];
  const isRadio = cat.maximo === 1;

  if (isRadio) {
    // Desmarca todos e marca o atual
    cat.complementos.forEach((c) => (c.selecionado = false));
    compl.selecionado = true;
  } else {
    compl.selecionado = !compl.selecionado;
    // se exceder o limite, desfaz a última seleção
    if (
      cat.maximo &&
      cat.complementos.filter((c) => c.selecionado).length > cat.maximo
    ) {
      compl.selecionado = false;
      showToast(`Máximo de ${cat.maximo} em "${cat.categoria}"`);
      // reflete no checkbox
      event.target.checked = false;
    }
  }
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

function confirmarComplementos() {
  // Regras por categoria
  for (const cat of produtoSelecionado.complementosPorCategoria) {
    const selecionados = cat.complementos.filter((c) => c.selecionado).length;

    if (cat.obrigatorio && selecionados === 0) {
      showToast(`Escolha pelo menos 1 em "${cat.categoria}"`);
      return;
    }
    if (cat.maximo && selecionados > cat.maximo) {
      showToast(`Máximo de ${cat.maximo} em "${cat.categoria}"`);
      return;
    }
  }

  carrinho.push(produtoSelecionado);
  atualizarCarrinho();
  showToast(`${produtoSelecionado.nome} adicionado ao carrinho`);
  fecharModalComplementos();
}

function fecharModalComplementos() {
  produtoSelecionado = null;
  document.getElementById("modal-complementos").classList.add("hidden");
  document.body.style.overflow = "auto";
}

// ✅ Carrinho
function abrirCarrinho(scrollToTop = false) {
  if (scrollToTop) window.scrollTo({ top: 0, behavior: "smooth" });
  document.body.style.overflow = "hidden";

  const modal = document.getElementById("modal");
  const cartList = document.getElementById("cart-list");
  const totalEl = document.getElementById("total");

  modal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");

  cartList.innerHTML = "";
  let total = 0;

  carrinho.forEach((item, index) => {
    let itemTotal = item.preco * item.quantidade;
    let complementoHTML = "";

    // Agrupar complementos por categoria
    const categoriasAgrupadas = [];

    item.complementosPorCategoria?.forEach((cat) => {
      const selecionados = cat.complementos
        .filter((c) => c.selecionado)
        .map((c) => {
          itemTotal += c.preco * item.quantidade;
          return { nome: c.nome, preco: c.preco };
        });

      if (selecionados.length) {
        categoriasAgrupadas.push({
          categoria: cat.categoria,
          itens: selecionados,
        });
      }
    });

    if (categoriasAgrupadas.length) {
      complementoHTML = `<ul class="text-xs text-gray-600 mt-1">
        ${categoriasAgrupadas
          .map(
            (cg) => `
          <li class="mt-1 font-semibold">${cg.categoria}:</li>
          ${cg.itens
            .map(
              (c) => `
            <li class="ml-3">- ${c.nome}${
                c.preco > 0 ? ` (+R$ ${c.preco.toFixed(2)})` : ""
              }</li>
          `
            )
            .join("")}
        `
          )
          .join("")}
      </ul>`;
    }

    total += itemTotal;

    const row = document.createElement("div");
    row.className = "border-b pb-3";
    row.innerHTML = `
      <div class="flex justify-between items-center mb-1">
        <h3 class="font-medium">${item.nome} <span class="text-sm text-gray-500">(R$${item.preco})</span></h3>
        <div class="flex gap-2">
          <button onclick="decrementarCarrinho(${index})" class="text-red-600 hover:text-red-800 rounded-full w-6 h-6 flex items-center justify-center"><i class="ph ph-trash"></i></button>
        </div>
      </div>
      <p class="text-sm text-gray-500">Qtd: ${item.quantidade}</p>
      ${complementoHTML}
    `;
    cartList.appendChild(row);
  });

  totalEl.textContent = `Total: R$ ${total.toFixed(2)}`;
}

function fecharCarrinho() {
  document.getElementById("modal").classList.add("hidden");
  document.body.style.overflow = "auto";

  [
    "cliente_nome",
    "cliente_endereco",
    "cliente_pagamento",
    "obs",
    "cliente_troco",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  document.getElementById("cliente_endereco").classList.add("hidden");
  document.getElementById("campo-troco").classList.add("hidden");
}

function calcularValorTotal() {
  return carrinho.reduce((sum, p) => {
    let subtotal = parseFloat(p.preco) * p.quantidade;
    p.complementosPorCategoria?.forEach((cat) => {
      cat.complementos.forEach((c) => {
        if (c.selecionado) subtotal += c.preco * p.quantidade;
      });
    });
    return sum + subtotal;
  }, 0);
}

function toggleEndereco() {
  const entrega = document.querySelector(
    'input[name="atendimento"]:checked'
  ).value;
  document
    .getElementById("cliente_endereco")
    .classList.toggle(
      "hidden",
      entrega === "presencial" || entrega === "online"
    );
}

function enviarPedidoWhatsApp() {
  if (!validarEtapa2()) return;

  const nome = document.getElementById("cliente_nome").value.trim();
  const atendimento = document.querySelector(
    'input[name="atendimento"]:checked'
  ).value;
  const endereco = document.getElementById("cliente_endereco").value.trim();
  const pagamento = document.getElementById("cliente_pagamento").value.trim();
  const troco = document.getElementById("cliente_troco").value.trim();
  const obs = document.getElementById("obs").value.trim();

  const mensagemProdutos = carrinho
    .map((p) => {
      let texto = `• ${p.quantidade}x ${p.nome} — R$ ${p.preco}`;

      if (p.complementosPorCategoria?.length) {
        p.complementosPorCategoria.forEach((cat) => {
          const selecionados = cat.complementos.filter((c) => c.selecionado);
          if (selecionados.length) {
            texto += `\n- ${cat.categoria}: \n • ${selecionados
              .map(
                (c) =>
                  `${c.nome} ${
                    c.preco > 0 ? " (+R$ " + c.preco.toFixed(2) + ")" : ""
                  }`
              )
              .join("\n • ")}`; //${selecionados.map(c => `${c.nome}(+R$ ${c.preco.toFixed(2)})`).join(', ')}`;
          }
        });
      }

      return texto;
    })
    .join("\n");

  const total = calcularValorTotal().toFixed(2);

  const mensagem = [
    "💬 *Nova Solicitação*",
    "",
    mensagemProdutos.trim(),
    "",
    `💰 *Total:* R$ ${total}`,
    "",
    `📝 *O que o paciente está sentindo:* ${
      obs || "Sem informações adicionais"
    }`,
    "",
    `👤 *Nome:* ${nome}`,
    `📅 *Preferência de atendimento:* ${
      atendimento === "presencial"
        ? "Presencial 🏥"
        : atendimento === "online"
        ? "Online 💻"
        : atendimento === "entregar"
        ? "Entrega 🏠"
        : "Não informado"
    }`,
    atendimento === "entregar" ? `📍 *Endereço:* ${endereco}` : "",
    "",
    `💳 *Forma de pagamento:* ${pagamento}`,
    pagamento.toLowerCase() === "dinheiro"
      ? `💵 *Troco para:* R$ ${troco || "Não informado"}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .replace(/\u00A0/g, " ") // remove espaços invisíveis
    .normalize("NFKC"); // normaliza unicode para evitar perda de emoji

  const numero = config.numero_whatsapp || "SEU_NUMERO";
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;

  const btnEnviar = document.getElementById("btn-enviar");
  btnEnviar.disabled = true;
  btnEnviar.textContent = "Enviando...";

  setTimeout(() => {
    btnEnviar.disabled = false;
    btnEnviar.textContent = "Enviar Pedido";
  }, 3000);

  window.open(url, "_blank");

  carrinho.length = 0;
  document.getElementById("cart-count").textContent = "0";
  fecharCarrinho();
}
function atualizarCarrinho() {
  document.getElementById("cart-count").textContent = carrinho.reduce(
    (acc, p) => acc + p.quantidade,
    0
  );
}

function incrementarCarrinho(index) {
  carrinho[index].quantidade++;
  atualizarCarrinho();
  abrirCarrinho();
}

function decrementarCarrinho(index) {
  if (carrinho[index].quantidade > 1) {
    carrinho[index].quantidade--;
  } else {
    carrinho.splice(index, 1);
  }
  atualizarCarrinho();
  abrirCarrinho();
}

document
  .getElementById("cliente_pagamento")
  .addEventListener("change", function () {
    const campoTroco = document.getElementById("campo-troco");
    campoTroco.classList.toggle(
      "hidden",
      this.value.toLowerCase() !== "dinheiro"
    );
  });
