// Referencias a elementos del DOM principales
const form = document.getElementById('book-form');
const bookList = document.getElementById('book-list');

// Variables de estado inicial
let books = JSON.parse(localStorage.getItem('books')) || [];
let editingIndex = null;
let currentSort = 'date-asc';

// Manejador de cambio de orden en el selector
document.getElementById('sort-select').addEventListener('change', (e) => {
  currentSort = e.target.value;
  renderBooks();
});

// Envío del formulario: agregar o modificar libro
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('title').value;
  const saga = document.getElementById('saga').value;
  const author = document.getElementById('author').value;
  const totalPages = parseInt(document.getElementById('totalPages').value);

  if (editingIndex !== null) {
    books[editingIndex] = {
      ...books[editingIndex],
      title,
      saga,
      author,
      totalPages
    };
    editingIndex = null;
  } else {
    books.push({
      title,
      saga,
      author,
      totalPages,
      currentPage: 0,
      finished: false,
      finishedDate: ''
    });
  }

  saveBooks();
  renderBooks();
  form.reset();
  document.querySelector('#book-form button[type="submit"]').textContent = 'Agregar';
});

// Guardar lista de libros en localStorage
function saveBooks() {
  localStorage.setItem('books', JSON.stringify(books));
}

// Eliminar un libro por índice
function deleteBook(index) {
  books.splice(index, 1);
  saveBooks();
  renderBooks();
}

// Editar un libro cargando sus datos en el formulario
function editBook(index) {
  const book = books[index];
  document.getElementById('title').value = book.title;
  document.getElementById('saga').value = book.saga;
  document.getElementById('author').value = book.author;
  document.getElementById('totalPages').value = book.totalPages;
  editingIndex = index;
  document.querySelector('#book-form button[type="submit"]').textContent = 'Modificar';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Ordenar libros según criterio y dirección seleccionados
function sortBooks(list) {
  const sorted = [...list];
  const [criteria, direction] = currentSort.split('-');

  const compare = (a, b, keyFn) => {
    const valA = keyFn(a);
    const valB = keyFn(b);
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  };

  if (criteria === 'title') {
    sorted.sort((a, b) => compare(a, b, x => x.title.toLowerCase()));
  } else if (criteria === 'author') {
    sorted.sort((a, b) => compare(a, b, x => x.author.toLowerCase()));
  } else if (criteria === 'pages') {
    sorted.sort((a, b) => compare(a, b, x => x.totalPages));
  } else if (criteria === 'date') {
    sorted.sort((a, b) => compare(a, b, x => new Date(x.finishedDate)));
  }

  return sorted;
}

// Mostrar la lista de libros en pantalla
function renderBooks() {
  bookList.innerHTML = '';

  const finishedBooks = books
    .map((book, i) => ({ ...book, originalIndex: i }))
    .filter(b => b.finished && b.finishedDate)
    .sort((a, b) => new Date(a.finishedDate) - new Date(b.finishedDate));

  const unfinishedBooks = books
    .map((book, i) => ({ ...book, originalIndex: i }))
    .filter(b => !b.finished || !b.finishedDate);

  const sortedBooks = sortBooks(finishedBooks).concat(unfinishedBooks);

  sortedBooks.forEach((book) => {
    const div = document.createElement('div');
    div.className = 'book';

    const progress = Math.floor((book.currentPage / book.totalPages) * 100);
    let titleStyle = book.finished ? 'color: var(--color-finished); cursor: pointer;' : 'cursor: pointer;';

    let content = `
      <div class="book-header">
        <div class="book-info">
          <div class="title-icon-wrapper">
            <h3 data-index="${book.originalIndex}" style="${titleStyle}">${book.title.toUpperCase()}</h3>
          </div>
          <p class="saga">${book.saga || 'Ninguna'}</p>
          <p class="author">${book.author}</p>
          <div class="pages-with-actions">
            <p class="pages">${book.totalPages} páginas</p>
            <div class="book-actions">
              <button class="edit-btn" data-index="${book.originalIndex}" title="Editar libro">✏️</button>
              <button class="delete-btn" data-index="${book.originalIndex}" title="Eliminar libro">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    `;

    if (book.finished) {
      content += `
        <p class="finished">
          <span class="finished-label">Completado el:</span>
          <input type="date" data-index="${book.originalIndex}" class="date-input" value="${book.finishedDate}">
        </p>
      `;
    } else {
      content += `
        <div class="progress-container">
          <div class="page-row">
            <label for="page-${book.originalIndex}">Página actual:</label>
            <input type="number" id="page-${book.originalIndex}" data-index="${book.originalIndex}" class="page-input" value="${book.currentPage}" min="0" max="${book.totalPages}" inputmode="numeric" pattern="\\d*">
          </div>
          <div class="progress-bar">
            <div class="progress" style="width: ${progress}%;">${progress}%</div>
          </div>
        </div>
      `;
    }

    content += `
      <div class="cover-container" data-index="${book.originalIndex}" title="Pulsa para añadir portada">
        ${book.coverImage ? `<img src="${book.coverImage}" alt="Portada de ${book.title}">` : `<span>+</span>`}
      </div>
    `;

    div.innerHTML = content;
    bookList.appendChild(div);
  });

  attachEventListeners();
  equalizeTitleHeights();
}

// Asignar eventos a elementos dinámicos: títulos, inputs, botones y portadas
function attachEventListeners() {
  document.querySelectorAll('h3[data-index]').forEach(title => {
    title.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      const book = books[index];
      book.finished = !book.finished;
      if (book.finished && !book.finishedDate) {
        book.finishedDate = new Date().toISOString().split('T')[0];
      }
      saveBooks();
      renderBooks();
    });
  });

  document.querySelectorAll('.page-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const index = parseInt(e.target.dataset.index);
      let value = parseInt(e.target.value);
      if (isNaN(value)) value = 0;

      const maxPages = books[index].totalPages;
      if (value < 0) value = 0;
      if (value > maxPages) value = maxPages;

      books[index].currentPage = value;
      e.target.value = value;

      const progress = Math.floor((value / maxPages) * 100);
      const progressBar = e.target.closest('.book').querySelector('.progress');
      progressBar.style.width = `${progress}%`;
      progressBar.textContent = `${progress}%`;

      saveBooks();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
      }
    });

    input.addEventListener('change', (e) => {
      renderBooks();
    });
  });

  document.querySelectorAll('.date-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const index = e.target.dataset.index;
      books[index].finishedDate = e.target.value;
      saveBooks();
      renderBooks();
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      deleteBook(index);
    });
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = e.target.dataset.index;
      editBook(index);
    });
  });

  attachCoverListeners();
}

// Exportar la lista de libros a un archivo JSON
function downloadBooks() {
  const blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'libros.json';
  a.click();
  URL.revokeObjectURL(url);
}

// Importar libros desde archivo JSON
function uploadBooks(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedBooks = JSON.parse(e.target.result);
      if (Array.isArray(importedBooks)) {
        books = importedBooks;
        saveBooks();
        renderBooks();
      } else {
        alert('Archivo inválido.');
      }
    } catch (err) {
      alert('Error al leer el archivo.');
    }
  };
  reader.readAsText(file);
}

// Manejador de clic en la portada para seleccionar imagen
function handleCoverClick(e) {
  const container = e.currentTarget;
  const index = container.dataset.index;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      books[index].coverImage = ev.target.result;
      saveBooks();
      renderBooks();
    };
    reader.readAsDataURL(file);
  };

  input.click();
}

// Asignar evento de clic a todas las portadas de libros
function attachCoverListeners() {
  document.querySelectorAll('.cover-container').forEach(container => {
    container.addEventListener('click', handleCoverClick);
  });
}

// Igualar visualmente la altura de todos los títulos
function equalizeTitleHeights() {
  const titles = document.querySelectorAll('.book-info h3');
  let maxHeight = 0;

  titles.forEach(title => {
    title.style.height = 'auto';
  });

  titles.forEach(title => {
    if (title.offsetHeight > maxHeight) {
      maxHeight = title.offsetHeight;
    }
  });

  titles.forEach(title => {
    title.style.height = maxHeight + 'px';
  });
}

// Eventos de exportación e importación de libros
document.getElementById('export-btn').addEventListener('click', downloadBooks);
document.getElementById('import-input').addEventListener('change', uploadBooks);

// Mostrar los libros al cargar la página
renderBooks();
