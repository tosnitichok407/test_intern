const formatNumber = new Intl.NumberFormat("th-TH");
const formatMoney = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
// เปิดผ่าน Express จะใช้ origin เดียวกัน; Apache/Live Server จะเรียก Node API โดยตรง
const API_BASE = window.location.port === "3000" ? "/api" : "http://localhost:3000/api";
let products = [];

const toast = (message, error = false) => {
  const element = document.querySelector("#toast");
  element.textContent = message;
  element.className = `${error ? "error " : ""}show`;
  window.clearTimeout(window.toastTimer);
  window.toastTimer = window.setTimeout(() => (element.className = ""), 3800);
};

async function api(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.error || "ไม่สามารถทำรายการได้ กรุณาลองใหม่อีกครั้ง");
  return body;
}

function fillProductSelect() {
  const select = document.querySelector("#adjustProduct");
  select.innerHTML =
    '<option value="">เลือกสินค้า</option>' +
    products
      .map(
        (product) =>
          `<option value="${product.product_id}">${escapeHtml(product.product_name)} (${escapeHtml(product.sku)}) · เหลือ ${formatNumber.format(product.stock_quantity)}</option>`,
      )
      .join("");
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ],
  );
}

function renderProducts() {
  const keyword = document
    .querySelector("#searchInput")
    .value.trim()
    .toLowerCase();
  const filtered = products.filter((p) =>
    `${p.product_name} ${p.sku}`.toLowerCase().includes(keyword),
  );
  document.querySelector("#productTable").innerHTML = filtered
    .map(
      (p) =>
        `<tr><td><span class="item-name">${escapeHtml(p.product_name)}</span><span class="sku">${escapeHtml(p.sku)}</span></td><td>${escapeHtml(p.category_name)}</td><td>฿${formatMoney.format(p.cost_price)}</td><td><span class="stock-pill ${p.stock_quantity < 5 ? "low" : ""}">${formatNumber.format(p.stock_quantity)} ชิ้น</span></td><td class="table-actions"><a class="quick-adjust" href="#stock" data-product="${p.product_id}">ปรับสต็อก</a><button class="delete-product" type="button" data-delete-product="${p.product_id}" data-product-name="${escapeHtml(p.product_name)}">ลบ</button></td></tr>`,
    )
    .join("");
  document.querySelector("#emptyProducts").hidden = filtered.length !== 0;
  document.querySelector("#tableSubtitle").textContent =
    `แสดง ${formatNumber.format(filtered.length)} จาก ${formatNumber.format(products.length)} รายการ`;
}

function renderLowStock(lowProducts) {
  document.querySelector("#lowStockCount").textContent = formatNumber.format(
    lowProducts.length,
  );
  document.querySelector("#alertBadge").textContent =
    `${formatNumber.format(lowProducts.length)} รายการ`;
  const list = document.querySelector("#lowStockList");
  list.innerHTML = lowProducts.length
    ? lowProducts
        .map(
          (p) =>
            `<div class="low-item"><span class="low-number">${formatNumber.format(p.stock_quantity)}</span><div><strong>${escapeHtml(p.product_name)}</strong><p>${escapeHtml(p.sku)} · ${escapeHtml(p.category_name)}</p></div></div>`,
        )
        .join("")
    : '<p class="muted">ยอดเยี่ยม! ยังไม่มีสินค้าใกล้หมด</p>';
}

async function loadData() {
  try {
    const [productData, categoryData, lowStockData] = await Promise.all([
      api(`${API_BASE}/products`),
      api(`${API_BASE}/categories`),
      api(`${API_BASE}/products/low-stock`),
    ]);
    products = productData.products;
    document.querySelector("#category").innerHTML =
      '<option value="">เลือกหมวดหมู่</option>' +
      categoryData.categories
        .map(
          (c) =>
            `<option value="${c.category_id}">${escapeHtml(c.category_name)}</option>`,
        )
        .join("");
    document.querySelector("#productCount").textContent = formatNumber.format(
      products.length,
    );
    document.querySelector("#stockCount").textContent = formatNumber.format(
      products.reduce((total, p) => total + Number(p.stock_quantity), 0),
    );
    fillProductSelect();
    renderProducts();
    renderLowStock(lowStockData.products);
  } catch (error) {
    toast(error.message, true);
  }
}

document
  .querySelector("#productForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    button.textContent = "กำลังบันทึก…";
    try {
      await api(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: document.querySelector("#sku").value.trim(),
          product_name: document.querySelector("#productName").value.trim(),
          category_id: Number(document.querySelector("#category").value),
          cost_price: Number(document.querySelector("#costPrice").value),
          stock_quantity: Number(document.querySelector("#initialStock").value),
        }),
      });
      event.target.reset();
      document.querySelector("#initialStock").value = 0;
      toast("เพิ่มสินค้าเข้าคลังเรียบร้อยแล้ว");
      await loadData();
    } catch (error) {
      toast(error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = "+ เพิ่มสินค้าเข้าคลัง";
    }
  });

document
  .querySelector("#stockForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    button.textContent = "กำลังบันทึก…";
    const type = document.querySelector(
      'input[name="transactionType"]:checked',
    ).value;
    try {
      const data = await api(`${API_BASE}/stock/adjust`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: Number(document.querySelector("#adjustProduct").value),
          quantity:
            Number(document.querySelector("#adjustQuantity").value) *
            (type === "OUT" ? -1 : 1),
          reason: document.querySelector("#adjustReason").value.trim(),
        }),
      });
      event.target.reset();
      document.querySelector('input[value="IN"]').checked = true;
      toast(
        `บันทึกสำเร็จ: คงเหลือ ${formatNumber.format(data.new_stock)} ชิ้น`,
      );
      await loadData();
    } catch (error) {
      toast(error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = "บันทึกรายการปรับสต็อก";
    }
  });

document
  .querySelector("#searchInput")
  .addEventListener("input", renderProducts);
document.querySelector("#refreshButton").addEventListener("click", loadData);

function setActiveNavigation(targetId) {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${targetId}`);
  });
}

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    setActiveNavigation(link.getAttribute("href").slice(1));
  });
});

document.querySelector("#productTable").addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-product]");
  if (deleteButton) {
    const productName = deleteButton.dataset.productName;
    const confirmed = window.confirm(
      `ต้องการลบ “${productName}” ใช่หรือไม่?\n\nการลบจะลบประวัติการปรับสต็อกของสินค้านี้ด้วย และไม่สามารถกู้คืนได้`,
    );
    if (!confirmed) return;

    deleteButton.disabled = true;
    deleteButton.textContent = "กำลังลบ…";
    api(`${API_BASE}/products/${deleteButton.dataset.deleteProduct}`, {
      method: "DELETE",
    })
      .then(() => {
        toast(`ลบสินค้า “${productName}” เรียบร้อยแล้ว`);
        return loadData();
      })
      .catch((error) => toast(error.message, true))
      .finally(() => {
        deleteButton.disabled = false;
        deleteButton.textContent = "ลบ";
      });
    return;
  }

  const target = event.target.closest("[data-product]");
  if (target) {
    document.querySelector("#adjustProduct").value = target.dataset.product;
    setActiveNavigation("stock");
  }
});

window.addEventListener("hashchange", () => {
  setActiveNavigation(window.location.hash.slice(1) || "top");
});
setActiveNavigation(window.location.hash.slice(1) || "top");
loadData();
