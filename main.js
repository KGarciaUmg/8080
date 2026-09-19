const cpu = new Intel8080();
const assembler = new Assembler8080();

let runInterval = null;
let memoryStart = 0;

function updateUI() {
    // Registers
    document.getElementById('reg-a').textContent = cpu.registers.a.toString(16).toUpperCase().padStart(2, '0');
    document.getElementById('reg-b').textContent = cpu.registers.b.toString(16).toUpperCase().padStart(2, '0');
    document.getElementById('reg-c').textContent = cpu.registers.c.toString(16).toUpperCase().padStart(2, '0');
    document.getElementById('reg-d').textContent = cpu.registers.d.toString(16).toUpperCase().padStart(2, '0');
    document.getElementById('reg-e').textContent = cpu.registers.e.toString(16).toUpperCase().padStart(2, '0');
    document.getElementById('reg-h').textContent = cpu.registers.h.toString(16).toUpperCase().padStart(2, '0');
    document.getElementById('reg-l').textContent = cpu.registers.l.toString(16).toUpperCase().padStart(2, '0');
    document.getElementById('reg-pc').textContent = cpu.registers.pc.toString(16).toUpperCase().padStart(4, '0');
    document.getElementById('reg-sp').textContent = cpu.registers.sp.toString(16).toUpperCase().padStart(4, '0');
    document.getElementById('reg-f').textContent = cpu.getFlagByte().toString(16).toUpperCase().padStart(2, '0');

    // Flags
    document.getElementById('flag-s').textContent = cpu.flags.s ? '1' : '0';
    document.getElementById('flag-z').textContent = cpu.flags.z ? '1' : '0';
    document.getElementById('flag-ac').textContent = cpu.flags.ac ? '1' : '0';
    document.getElementById('flag-p').textContent = cpu.flags.p ? '1' : '0';
    document.getElementById('flag-cy').textContent = cpu.flags.cy ? '1' : '0';

    document.getElementById('status-badge').textContent = cpu.halted ? 'Halted' : (runInterval ? 'Running' : 'Idle');
    document.getElementById('status-badge').style.backgroundColor = cpu.halted ? '#fee2e2' : (runInterval ? '#f0fdf4' : '#e2e8f0');

    renderMemory();
    renderStack();
    updateFPUUI();
}

function renderStack() {
    const table = document.getElementById('stack-table');
    if (!table) return;
    table.innerHTML = '';

    const currentSP = cpu.registers.sp;

    // Show 5 slots (2-byte aligned) from SP - 4 to SP + 6
    for (let offset = 6; offset >= -4; offset -= 2) {
        const addr = (currentSP + offset) & 0xFFFF;

        const row = document.createElement('div');
        row.className = 'stack-row';
        if (offset === 0) {
            row.classList.add('active');
        }

        const addrSpan = document.createElement('span');
        addrSpan.className = 'stack-addr';
        addrSpan.textContent = (offset === 0 ? 'SP ➔ ' : '     ') + addr.toString(16).toUpperCase().padStart(4, '0') + ':';

        const low = cpu.readMemory(addr);
        const high = cpu.readMemory((addr + 1) & 0xFFFF);
        const val16 = (high << 8) | low;

        const valSpan = document.createElement('span');
        valSpan.className = 'stack-val';
        valSpan.textContent = val16.toString(16).toUpperCase().padStart(4, '0') + 'H (' + high.toString(16).toUpperCase().padStart(2, '0') + ' ' + low.toString(16).toUpperCase().padStart(2, '0') + ')';

        row.appendChild(addrSpan);
        row.appendChild(valSpan);
        table.appendChild(row);
    }
}

function renderMemory() {
    const table = document.getElementById('memory-table');
    table.innerHTML = '';

    // Header
    const empty = document.createElement('div');
    empty.className = 'mem-cell mem-header';
    empty.textContent = '';
    table.appendChild(empty);

    for (let i = 0; i < 16; i++) {
        const h = document.createElement('div');
        h.className = 'mem-cell mem-header';
        h.textContent = i.toString(16).toUpperCase();
        table.appendChild(h);
    }

    // Rows
    for (let row = 0; row < 8; row++) {
        const addr = (memoryStart + row * 16) & 0xFFFF;
        const h = document.createElement('div');
        h.className = 'mem-cell mem-addr';
        h.textContent = addr.toString(16).toUpperCase().padStart(4, '0');
        table.appendChild(h);

        for (let col = 0; col < 16; col++) {
            const cellAddr = (addr + col) & 0xFFFF;
            const c = document.createElement('div');
            c.className = 'mem-cell';
            if (cellAddr === cpu.registers.pc) c.style.backgroundColor = '#fde047';
            c.textContent = cpu.readMemory(cellAddr).toString(16).toUpperCase().padStart(2, '0');
            table.appendChild(c);
        }
    }
}

document.getElementById('btn-assemble').addEventListener('click', () => {
    const source = document.getElementById('code-editor').value;
    const output = document.getElementById('assembler-output');
    try {
        const result = assembler.assemble(source);
        cpu.memory.set(result.binary);
        output.textContent = 'Assembly successful! Loaded into memory.';
        output.className = 'success';
        updateUI();
    } catch (e) {
        output.textContent = 'Error: ' + e.message;
        output.className = 'error';
    }
});

document.getElementById('btn-clear-code').addEventListener('click', () => {
    document.getElementById('code-editor').value = '';
    const output = document.getElementById('assembler-output');
    if (output) {
        output.textContent = '';
        output.className = '';
    }
});

document.getElementById('btn-step').addEventListener('click', () => {
    cpu.step();
    updateUI();
});

document.getElementById('btn-run').addEventListener('click', () => {
    if (runInterval) return;
    runInterval = setInterval(() => {
        if (cpu.halted) {
            clearInterval(runInterval);
            runInterval = null;
            updateUI();
            return;
        }
        for (let i = 0; i < 100; i++) { // Execute in bursts
            cpu.step();
            if (cpu.halted) break;
        }
        updateUI();
    }, 10);
    updateUI();
});

document.getElementById('btn-stop').addEventListener('click', () => {
    if (runInterval) {
        clearInterval(runInterval);
        runInterval = null;
        updateUI();
    }
});

document.getElementById('btn-reset').addEventListener('click', () => {
    if (runInterval) {
        clearInterval(runInterval);
        runInterval = null;
    }
    cpu.reset();

    // Clear assembler output
    const output = document.getElementById('assembler-output');
    if (output) {
        output.textContent = '';
        output.className = '';
    }

    // Reset memory start address and variable
    const memStartInput = document.getElementById('mem-start-addr');
    if (memStartInput) {
        memStartInput.value = '0000';
    }
    memoryStart = 0;

    updateUI();
});

document.getElementById('btn-mem-go').addEventListener('click', () => {
    const val = document.getElementById('mem-start-addr').value;
    memoryStart = parseInt(val, 16) || 0;
    renderMemory();
});

// Initial UI update
updateUI();



function updateFPUUI() {
    if (!cpu || !cpu.fpu) return;
    
    // 1. Actualizar Operación y Estado
    const lastOpElem = document.getElementById('fpu-last-op');
    const statusElem = document.getElementById('fpu-status');
    const flagZeroElem = document.getElementById('fpu-flag-zero');
    const stackElem = document.getElementById('fpu-stack-view');

    if (lastOpElem) lastOpElem.innerText = cpu.fpu.lastOp;
    if (statusElem) statusElem.innerText = '0x' + cpu.fpu.status.toString(16).padStart(2, '0').toUpperCase();
    
    if (flagZeroElem) {
        const hasDivZero = (cpu.fpu.status & 0x02) !== 0;
        flagZeroElem.innerText = hasDivZero ? 'ERROR (DIV/0)' : 'NO';
        flagZeroElem.style.color = hasDivZero ? '#dc2626' : '#16a34a';
    }

    // 2. Mostrar contenido de la pila
    if (stackElem) {
        if (cpu.fpu.stack.length === 0) {
            stackElem.innerText = '[ Pila vacía ]';
        } else {
            stackElem.innerHTML = cpu.fpu.stack
                .map((val, idx) => `<span style="background: #e0e7ff; padding: 2px 6px; border-radius: 4px; margin-right: 4px;">Top[${idx}]: <strong>${val}</strong></span>`)
                .join(' ');
        }
    }
}