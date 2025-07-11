
let entitiesSortKey = 'ENTIDADE';
let entitiesSortAsc = true;

export async function renderEntitiesTable(nifsMap) {
  const tbody = document.querySelector('#entitiesTable tbody');
  tbody.innerHTML = '';
  // Convert map to array for sorting
  const entitiesArr = Object.entries(nifsMap).map(([id, entity]) => ({ id, entity }));
  entitiesArr.sort((a, b) => {
    let cmp;
    if (entitiesSortKey === 'NIF') {
      cmp = a.id.localeCompare(b.id, 'pt');
    } else {
      cmp = a.entity.localeCompare(b.entity, 'pt');
    }
    return entitiesSortAsc ? cmp : -cmp;
  });
  entitiesArr.forEach(({ id, entity }) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${id}</td><td>${entity}</td>`;
    tbody.appendChild(tr);
  });
}

export function entitiesListListeners(nifsMap) {
  // Add event listeners for list of entities sorting
  document.getElementById('sortNif').addEventListener('click', () => {
    entitiesSortKey = 'NIF';
    entitiesSortAsc = !entitiesSortAsc;
    renderEntitiesTable(nifsMap);
  });

  document.getElementById('sortEntidade').addEventListener('click', () => {
    entitiesSortKey = 'ENTIDADE';
    entitiesSortAsc = !entitiesSortAsc;
    renderEntitiesTable(nifsMap);
  });
}