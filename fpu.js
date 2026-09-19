class FPU8080 {
  constructor() {
    this.reset();
  }

  reset() {
    this.inputBuffer = [];
    this.outputBuffer = [];
    this.stack = [];
    this.status = 0x00; // Bit 0: Busy, Bit 1: DivZero, Bit 2: Error
    this.lastOp = 'NONE';
  }

  writePort(port, byte) {
    if (port === 0xE0) {
      this.inputBuffer.push(byte & 0xFF);
      if (this.inputBuffer.length === 4) {
        const raw = new Uint8Array(this.inputBuffer);
        const view = new Float32Array(raw.buffer);
        this.stack.push(view[0]);
        this.inputBuffer = [];
      }
    } else if (port === 0xE1) {
      this.executeCommand(byte);
    }
  }

  readPort(port) {
    if (port === 0xE0) {
      return this.outputBuffer.length > 0 ? this.outputBuffer.shift() : 0x00;
    } else if (port === 0xE1) {
      return this.status;
    }
    return 0x00;
  }

  executeCommand(cmd) {
    if (cmd === 0x0F) {
      this.reset();
      return;
    }
    if (this.stack.length < 2 && cmd <= 0x04) {
      this.status |= 0x04;
      return;
    }

    const b = this.stack.pop();
    const a = this.stack.pop();
    let res = 0;

    switch (cmd) {
      case 0x01: res = a + b; this.lastOp = 'FADD'; break;
      case 0x02: res = a - b; this.lastOp = 'FSUB'; break;
      case 0x03: res = a * b; this.lastOp = 'FMUL'; break;
      case 0x04:
        this.lastOp = 'FDIV';
        if (b === 0) {
          this.status |= 0x02;
          res = 0;
        } else {
          res = a / b;
        }
        break;
      default:
        this.status |= 0x04;
        return;
    }

    this.stack.push(res);
    const floatArr = new Float32Array([res]);
    this.outputBuffer = Array.from(new Uint8Array(floatArr.buffer));
  }
}

if (typeof module !== 'undefined') {
  module.exports = FPU8080;
}