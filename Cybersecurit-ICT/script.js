// ---------- core ----------
let currentCipher = 'playfair';
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function switchCipher(type) {
    currentCipher = type;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.cipher-section').forEach(s => s.classList.remove('active'));
    const map = { playfair:0, monoalphabetic:1, caesar:2, otp:3, hill:4 };
    document.querySelectorAll('.tab-btn')[map[type]].classList.add('active');
    document.getElementById(type+'Section').classList.add('active');
    if (type==='caesar') updateCaesarMapping();
    if (type==='otp') autoMatchOTPKeyLength();
    if (type==='hill') validateHillMatrix();
    process(true);
}

// ---------- Playfair ----------
function generateMatrix(key) {
    key = key.toUpperCase().replace(/J/g,"I").replace(/[^A-Z]/g,"");
    let combined = key + "ABCDEFGHIKLMNOPQRSTUVWXYZ";
    let unique = [];
    for (let ch of combined) if (!unique.includes(ch)) unique.push(ch);
    let matrix = [];
    for (let i=0;i<5;i++) matrix.push(unique.slice(i*5, i*5+5));
    return matrix;
}
function displayGrid(matrix) {
    const el = document.getElementById("cipherGrid");
    el.innerHTML = "";
    matrix.flat().forEach(ch => {
        const div = document.createElement("div");
        div.className = "grid-cell";
        div.innerText = ch==='I' ? 'I/J' : ch;
        el.appendChild(div);
    });
}
function findPos(matrix, ch) {
    if (ch==='J') ch='I';
    for (let r=0;r<5;r++) for (let c=0;c<5;c++) if (matrix[r][c]===ch) return {row:r, col:c};
    return null;
}
function preparePlayfair(text) {
    text = text.toUpperCase().replace(/J/g,"I").replace(/[^A-Z]/g,"");
    let out = "";
    for (let i=0;i<text.length;i++) {
        out += text[i];
        if (i<text.length-1 && text[i]===text[i+1]) out += "X";
    }
    if (out.length%2!==0) out += "X";
    return out.match(/.{1,2}/g) || [];
}
function playfairCipher(text, key, encrypt=true) {
    const matrix = generateMatrix(key);
    displayGrid(matrix);
    let pairs = encrypt ? preparePlayfair(text) : text.toUpperCase().replace(/J/g,"I").replace(/[^A-Z]/g,"").match(/.{1,2}/g) || [];
    const shift = encrypt ? 1 : 4;
    let result = "";
    pairs.forEach(p => {
        if (p.length<2) return;
        let a = findPos(matrix, p[0]), b = findPos(matrix, p[1]);
        if (!a || !b) return;
        if (a.row===b.row) {
            result += matrix[a.row][(a.col+shift)%5];
            result += matrix[b.row][(b.col+shift)%5];
        } else if (a.col===b.col) {
            result += matrix[(a.row+shift)%5][a.col];
            result += matrix[(b.row+shift)%5][b.col];
        } else {
            result += matrix[a.row][b.col];
            result += matrix[b.row][a.col];
        }
    });
    return result;
}

// ---------- Monoalphabetic ----------
function generateRandomMonoKey() {
    let arr = ALPHABET.split('');
    for (let i=arr.length-1;i>0;i--) {
        let j = Math.floor(Math.random()*(i+1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    document.getElementById('monoKey').value = arr.join('');
    process(true);
}
function monoalphabeticCipher(text, key, encrypt=true) {
    key = key.toUpperCase().replace(/[^A-Z]/g,"");
    if (key.length!==26) return "INVALID KEY";
    text = text.toUpperCase();
    let result = "";
    for (let ch of text) {
        let idx = encrypt ? ALPHABET.indexOf(ch) : key.indexOf(ch);
        result += idx!==-1 ? (encrypt ? key[idx] : ALPHABET[idx]) : ch;
    }
    return result;
}

// ---------- Caesar ----------
function updateCaesarMapping() {
    let shift = ((parseInt(document.getElementById("caesarShift").value)||0)%26+26)%26;
    let parts = [];
    for (let i=0;i<6;i++) parts.push(`${ALPHABET[i]} → ${ALPHABET[(i+shift)%26]}`);
    document.getElementById("caesarMapping").innerHTML = `<i class="fas fa-arrow-right"></i> ${parts.join(' · ')} …`;
}
function caesarCipher(text, shift, encrypt=true) {
    shift = ((parseInt(shift)||0)%26+26)%26;
    if (!encrypt) shift = (26-shift)%26;
    return text.toUpperCase().split('').map(ch => {
        let idx = ALPHABET.indexOf(ch);
        return idx!==-1 ? ALPHABET[(idx+shift)%26] : ch;
    }).join('');
}

// ---------- OTP ----------
function generateOTPKey() {
    const text = document.getElementById("text").value.toUpperCase().replace(/[^A-Z]/g,"");
    let len = Math.max(text.length, 10);
    let key = "";
    for (let i=0;i<len;i++) key += ALPHABET[Math.floor(Math.random()*26)];
    document.getElementById("otpKey").value = key;
    autoMatchOTPKeyLength();
    process(true);
}
function autoMatchOTPKeyLength() {
    if (currentCipher!=='otp') return;
    const text = document.getElementById("text").value.toUpperCase().replace(/[^A-Z]/g,"");
    const key = document.getElementById("otpKey").value.toUpperCase().replace(/[^A-Z]/g,"");
    const el = document.getElementById("otpStatus");
    if (key.length < text.length) {
        el.innerHTML = `<i class="fas fa-triangle-exclamation" style="color:#b45309;"></i> Warning: key (${key.length}) < message (${text.length}) – output truncated.`;
    } else {
        el.innerHTML = `<i class="fas fa-circle-check"></i> Key: ${key.length} · message letters: ${text.length} (valid)`;
    }
}
function oneTimePadCipher(text, key, encrypt=true) {
    key = key.toUpperCase().replace(/[^A-Z]/g,"");
    text = text.toUpperCase();
    let clean = text.replace(/[^A-Z]/g,"");
    if (key.length < clean.length) return "KEY TOO SHORT";
    let result = "", ki=0;
    for (let ch of text) {
        let tIdx = ALPHABET.indexOf(ch);
        if (tIdx!==-1) {
            let kIdx = ALPHABET.indexOf(key[ki]);
            if (kIdx===-1) { result += ch; continue; }
            let newIdx = encrypt ? (tIdx+kIdx)%26 : (tIdx-kIdx+26)%26;
            result += ALPHABET[newIdx];
            ki++;
        } else result += ch;
    }
    return result;
}

// ---------- Hill ----------
function getModInverse(a,m) {
    a = ((a%m)+m)%m;
    for (let x=1;x<m;x++) if ((a*x)%m===1) return x;
    return -1;
}
function getHillMatrix() {
    return [
        [parseInt(document.getElementById("h00").value)||0, parseInt(document.getElementById("h01").value)||0],
        [parseInt(document.getElementById("h10").value)||0, parseInt(document.getElementById("h11").value)||0]
    ];
}
function validateHillMatrix() {
    if (currentCipher!=='hill') return true;
    let m = getHillMatrix();
    let det = (m[0][0]*m[1][1] - m[0][1]*m[1][0]);
    let detMod = ((det%26)+26)%26;
    let inv = getModInverse(detMod,26);
    const el = document.getElementById("hillStatus");
    if (inv===-1) {
        el.innerHTML = `<i class="fas fa-circle-xmark" style="color:#b91c1c;"></i> Invalid matrix (det mod 26 = ${detMod}) – not invertible.`;
        return false;
    } else {
        el.innerHTML = `<i class="fas fa-check-circle"></i> det = ${det} (mod 26 = ${detMod}) · valid`;
        return true;
    }
}
function hillCipher(text, encrypt=true) {
    if (!validateHillMatrix()) return "INVALID MATRIX";
    let m = getHillMatrix();
    if (!encrypt) {
        let det = (m[0][0]*m[1][1] - m[0][1]*m[1][0]);
        let invDet = getModInverse(det,26);
        let adj00 = ((m[1][1]%26)+26)%26, adj01 = ((-m[0][1]%26)+26)%26;
        let adj10 = ((-m[1][0]%26)+26)%26, adj11 = ((m[0][0]%26)+26)%26;
        m = [
            [(adj00*invDet)%26, (adj01*invDet)%26],
            [(adj10*invDet)%26, (adj11*invDet)%26]
        ];
    }
    let clean = text.toUpperCase().replace(/[^A-Z]/g,"");
    if (clean.length%2!==0) clean += "X";
    let result = "";
    for (let i=0;i<clean.length;i+=2) {
        let v0 = ALPHABET.indexOf(clean[i]), v1 = ALPHABET.indexOf(clean[i+1]);
        let r0 = (m[0][0]*v0 + m[0][1]*v1)%26;
        let r1 = (m[1][0]*v0 + m[1][1]*v1)%26;
        result += ALPHABET[r0] + ALPHABET[r1];
    }
    return result;
}

// ---------- controller ----------
function process(isEncrypt) {
    const text = document.getElementById("text").value;
    let out = "";
    const c = currentCipher;
    if (c==='playfair') {
        const key = document.getElementById("playfairKey").value;
        if (!key) { alert("Enter Playfair key"); return; }
        out = playfairCipher(text, key, isEncrypt);
        if (!isEncrypt) {
            let clean = "";
            for (let i=0;i<out.length;i++) {
                if (out[i]==='X' && i>0 && i<out.length-1 && out[i-1]===out[i+1]) continue;
                clean += out[i];
            }
            if (clean.endsWith('X')) clean = clean.slice(0,-1);
            out = clean;
        }
    } else if (c==='monoalphabetic') {
        out = monoalphabeticCipher(text, document.getElementById("monoKey").value, isEncrypt);
    } else if (c==='caesar') {
        out = caesarCipher(text, document.getElementById("caesarShift").value, isEncrypt);
    } else if (c==='otp') {
        out = oneTimePadCipher(text, document.getElementById("otpKey").value, isEncrypt);
    } else {
        out = hillCipher(text, isEncrypt);
    }
    document.getElementById("result").innerHTML = `<i class="fas fa-${isEncrypt?'lock':'unlock'}"></i> ${out}`;
}

// ---------- init ----------
const initMatrix = generateMatrix(document.getElementById("playfairKey").value);
displayGrid(initMatrix);
process(true);
