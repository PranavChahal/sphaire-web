// UI Controls for the 3D Viewer
window.addEventListener("DOMContentLoaded", function () {
  // Create a simple UI panel
  function createUI(scene) {
    // Create a StackPanel to hold our controls
    const advancedTexture =
      BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    const panel = new BABYLON.GUI.StackPanel();
    panel.width = "220px";
    panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    panel.top = "20px";
    panel.right = "20px";
    panel.background = "rgba(43, 43, 43, 0.7)";
    panel.paddingTop = "10px";
    panel.paddingBottom = "10px";
    panel.paddingLeft = "10px";
    panel.paddingRight = "10px";
    panel.cornerRadius = 10;
    advancedTexture.addControl(panel);

    // Add a header
    const header = new BABYLON.GUI.TextBlock();
    header.text = "Grid Controls (Disabled)";
    header.height = "30px";
    header.color = "gray";
    header.fontSize = 16;
    header.fontWeight = "bold";
    header.paddingBottom = "10px";
    panel.addControl(header);

    // Add grid visibility controls
    addGridVisibilityControl(panel, scene, "XZ Grid (Floor)", "xzGrid");
    addGridVisibilityControl(panel, scene, "XY Grid (Back)", "xyGrid");
    addGridVisibilityControl(panel, scene, "YZ Grid (Side)", "yzGrid");

    // Add a reset camera button (still active)
    const resetButton = BABYLON.GUI.Button.CreateSimpleButton(
      "resetCamera",
      "Reset Camera"
    );
    resetButton.width = "200px";
    resetButton.height = "30px";
    resetButton.color = "white";
    resetButton.background = "#4CAF50";
    resetButton.cornerRadius = 5;
    resetButton.paddingTop = "5px";
    resetButton.paddingBottom = "5px";
    resetButton.paddingLeft = "10px";
    resetButton.paddingRight = "10px";
    resetButton.onPointerUpObservable.add(function () {
      // Reset camera to default position
      const camera = scene.activeCamera;
      if (camera instanceof BABYLON.ArcRotateCamera) {
        camera.alpha = -Math.PI / 2;
        camera.beta = Math.PI / 2.5;
        camera.radius = 10;
        camera.target = BABYLON.Vector3.Zero();
      }
    });
    panel.addControl(resetButton);

    return panel;
  }

  // Helper function to add a checkbox for grid visibility
  function addGridVisibilityControl(panel, scene, label, gridName) {
    const gridContainer = new BABYLON.GUI.StackPanel();
    gridContainer.isVertical = false;
    gridContainer.height = "30px";
    panel.addControl(gridContainer);

    const checkbox = new BABYLON.GUI.Checkbox();
    checkbox.width = "20px";
    checkbox.height = "20px";
    checkbox.isChecked = true;
    checkbox.color = "gray";
    checkbox.isEnabled = false; // Disable the checkbox
    // The onIsCheckedChangedObservable is kept but won't be triggered since the checkbox is disabled
    checkbox.onIsCheckedChangedObservable.add(function (value) {
      // Find all meshes that match the grid name pattern
      const grids = scene.meshes.filter((mesh) => {
        return (
          mesh.name.includes(gridName) ||
          (gridName === "xzGrid" && mesh.name === "ground") ||
          mesh.name.startsWith(gridName.substring(0, 2))
        );
      });

      // Set visibility for all matching meshes
      grids.forEach((grid) => {
        grid.setEnabled(value);
      });
    });
    gridContainer.addControl(checkbox);

    const textBlock = new BABYLON.GUI.TextBlock();
    textBlock.text = label;
    textBlock.width = "170px";
    textBlock.height = "20px";
    textBlock.color = "gray"; // Change color to gray to appear disabled
    textBlock.fontSize = 14;
    textBlock.textHorizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    textBlock.paddingLeft = "10px";
    gridContainer.addControl(textBlock);
  }

  // Export the createUI function to make it available to app.js
  window.createUI = createUI;
});
