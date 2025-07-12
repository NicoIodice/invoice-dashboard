export function setupMobileTooltips() {
  // Check if device supports touch
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  if (isTouchDevice) {
    // Handle quarter tooltips, NIF tooltips, and class value tooltips
    document.addEventListener('click', (e) => {
      const quarterTooltip = e.target.closest('.quarter-tooltip');
      const calendarTooltip = e.target.closest('.calendar-tooltip');
      
      if (quarterTooltip) {
        e.preventDefault();
        e.stopPropagation();
        
        // Close all other tooltips
        document.querySelectorAll('.quarter-tooltip.active').forEach(tooltip => {
          if (tooltip !== quarterTooltip) {
            tooltip.classList.remove('active');
          }
        });
        
        // Toggle current tooltip
        quarterTooltip.classList.toggle('active');
      } else if (calendarTooltip) {
        e.preventDefault();
        e.stopPropagation();
        
        // Close all other tooltips
        document.querySelectorAll('.calendar-tooltip.active').forEach(tooltip => {
          if (tooltip !== calendarTooltip) {
            tooltip.classList.remove('active');
          }
        });
        
        // Toggle current tooltip
        calendarTooltip.classList.toggle('active');
      } else {
        // Close all tooltips when clicking outside
        document.querySelectorAll('.quarter-tooltip.active, .calendar-tooltip.active').forEach(tooltip => {
          tooltip.classList.remove('active');
        });
      }
    });
    
    // Close tooltips when scrolling
    document.addEventListener('scroll', () => {
      document.querySelectorAll('.quarter-tooltip.active, .calendar-tooltip.active').forEach(tooltip => {
        tooltip.classList.remove('active');
      });
    });
  }
}