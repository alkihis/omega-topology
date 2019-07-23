import { Component, h, Element, Event, EventEmitter } from '@stencil/core';

@Component({
  tag: "omega-reheat",
  styleUrl: 'omega-reheat.css',
  shadow: false
})
export class OmegaTrim {
  @Element() el: HTMLElement;

  public static readonly tag = "omega-reheat";

  @Event({
    eventName: "omega-reheat.reheat"
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
        <div class="reheat-container" title="Reheat graph" data-toggle="modal" data-target="#modalReheat">
          <i class="material-icons">whatshot</i>
        </div>

        <div class="modal fade" id="modalReheat" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLabel">Reheat graph ?</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                You will lose all invisible nodes until you force a full graph reload.
                </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-warning" data-dismiss="modal" onClick={() => this.emit()}>Reheat</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
} 
