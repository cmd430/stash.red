export class EventListener {

  #abortControler = new AbortController()

  constructor (opts = { once: true }) {
    this.once = opts.once ?? true
    this.autoRemove = opts.autoRemove ?? true
  }

  on (event, onEvent, onCancel) {
    addEventListener(event, onEvent, {
      once : this.once,
      signal: this.#abortControler.signal
    })

    // Auto remove on cancel
    addEventListener('cancel', () => {
      this.#abortControler.abort()

      if (onCancel) onCancel()

      return console.info(event, 'canceled')
    }, {
      once : this.once,
      signal: this.#abortControler.signal
    })
  }

  remove () {
    this.#abortControler.abort()
  }

}
