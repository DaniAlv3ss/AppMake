// --- CONFIGURAÇÃO ---
var DB_FILENAME = "Banco de Dados Makeup - Vitória Camilli";
var GEMINI_API_KEY = "SUA_CHAVE_GEMINI_AQUI"; 

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Vitória Camilli Makeup')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// --- BANCO DE DADOS (GOOGLE SHEETS) ---

function getDatabase() {
  var files = DriveApp.getFilesByName(DB_FILENAME);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  } else {
    var ss = SpreadsheetApp.create(DB_FILENAME);
    setupTabs(ss);
    return ss;
  }
}

function setupTabs(ss) {
  // Definição das colunas
  var schemas = {
    'agendamentos': ['id', 'clientId', 'serviceId', 'startTime', 'endTime', 'status', 'price', 'paidAmount', 'paymentStatus', 'transactions'],
    'clientes': ['id', 'name', 'phone', 'email'],
    'servicos': ['id', 'name', 'price', 'duration', 'color'],
    'despesas': ['id', 'description', 'amount', 'date', 'category']
  };

  // Dados iniciais para não começar vazio (Seed)
  var initialData = {
    'clientes': [
      ['c1', 'Juliana Paes', '(11) 99999-0001', 'ju.paes@email.com'],
      ['c2', 'Marina Ruy', '(21) 98888-0002', 'marina@email.com'],
      ['c3', 'Anitta', '(21) 97777-0003', 'anitta@email.com']
    ],
    'servicos': [
      ['s1', 'Maquiagem Social', 150, 60, 'bg-rose-100 border-rose-200 text-rose-700'],
      ['s2', 'Noiva Completa', 800, 180, 'bg-purple-100 border-purple-200 text-purple-700'],
      ['s3', 'Design de Sobrancelha', 60, 30, 'bg-amber-100 border-amber-200 text-amber-700']
    ],
    'agendamentos': [
      // Gera um agendamento para hoje
      ['appt-1', 'c1', 's1', new Date().toISOString().split('T')[0]+'T10:00:00', new Date().toISOString().split('T')[0]+'T11:00:00', 'scheduled', 150, 0, 'pending', '[]'],
      // Gera um agendamento passado (concluído)
      ['appt-2', 'c2', 's2', '2023-10-01T14:00:00', '2023-10-01T17:00:00', 'completed', 800, 800, 'paid', '[{"amount":800,"date":"2023-10-01","type":"final"}]']
    ],
    'despesas': [
      ['e1', 'Kit de Pincéis', 350, new Date().toISOString(), 'product']
    ]
  };

  Object.keys(schemas).forEach(function(tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      sheet.appendRow(schemas[tabName]); // Cabeçalhos
      
      // Inserir dados iniciais se houver
      if (initialData[tabName] && initialData[tabName].length > 0) {
        initialData[tabName].forEach(function(row) {
          sheet.appendRow(row);
        });
      }
    }
  });

  var sheet1 = ss.getSheetByName('Página1');
  if (sheet1 && ss.getSheets().length > 1) ss.deleteSheet(sheet1);
}

// --- INTEGRAÇÃO GEMINI ---
function callGeminiAPI(prompt) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("SUA_CHAVE")) {
    return JSON.stringify([{title: "API não configurada", description: "Configure a chave no Code.gs", type: "alert"}]);
  }
  // ... (código Gemini mantido igual) ...
  return "[]"; 
}

// --- API CRUD ---
function getData(table) {
  var ss = getDatabase();
  var sheet = ss.getSheetByName(table);
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Retorna vazio se só tiver cabeçalho
  
  var headers = data[0];
  var rows = data.slice(1);
  
  return rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, index) {
      var value = row[index];
      // Tenta converter strings JSON de volta para objetos
      if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
        try { value = JSON.parse(value); } catch(e) {}
      }
      obj[header] = value;
    });
    return obj;
  });
}

function addData(table, item) {
  var ss = getDatabase();
  var sheet = ss.getSheetByName(table);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = headers.map(function(header) {
    var val = item[header];
    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
    return val || "";
  });
  sheet.appendRow(row);
  return item;
}

function updateData(table, id, item) {
  var ss = getDatabase();
  var sheet = ss.getSheetByName(table);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      var headers = data[0];
      var rowToUpdate = [];
      headers.forEach(function(header) {
        var newVal = item[header];
        if (newVal === undefined) rowToUpdate.push(data[i][headers.indexOf(header)]);
        else {
           if (typeof newVal === 'object' && newVal !== null) newVal = JSON.stringify(newVal);
           rowToUpdate.push(newVal);
        }
      });
      sheet.getRange(i + 1, 1, 1, rowToUpdate.length).setValues([rowToUpdate]);
      return item;
    }
  }
  return null;
}

function deleteData(table, id) {
  var ss = getDatabase();
  var sheet = ss.getSheetByName(table);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}
