import { Component, h, Element, Event, EventEmitter } from '@stencil/core';

@Component({
  tag: "omega-reset",
  styleUrl: 'omega-reset.css',
  shadow: false
})
export class OmegaTrim {
  @Element() el: HTMLElement;

  public static readonly tag = "omega-reset";

  @Event({
    eventName: "omega-reset.reset"
  }) reheat: EventEmitter<void>;

  emit() {
    this.reheat.emit();
  }

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <div>
        <div class="reset-container" title="Reset graph" data-toggle="modal" data-target="#modalReset">
          <i class="material-icons">rotate_left</i>
        </div>

        <div class="modal fade" id="modalReset" tabindex="-1" role="dialog" aria-labelledby="modalResetAll" aria-hidden="true">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="modalResetAll">Reset graph ?</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                Original graph skeleton will be loaded.
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-warning" data-dismiss="modal" onClick={() => this.emit()}>Reset</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
} 
