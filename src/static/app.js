document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and reset dropdown options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantItems = details.participants.length
          ? details.participants.map(p => `
              <li data-email="${p}" data-activity="${name}">
                <span class="participant-email">${p}</span>
                <button class="unregister-btn" title="Unregister participant" aria-label="Unregister ${p}">&times;</button>
              </li>`).join("")
          : `<li class="no-participants">No participants yet — be the first!</li>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> <span class="spots-badge ${spotsLeft === 0 ? 'spots-full' : 'spots-open'}">${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left</span></p>
          <div class="participants-section">
            <p class="participants-heading">Enrolled Participants</p>
            <ul class="participants-list">${participantItems}</ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Attach unregister handlers
        activityCard.querySelectorAll(".unregister-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const li = btn.closest("li");
            const email = li.dataset.email;
            const activity = li.dataset.activity;
            try {
              const res = await fetch(
                `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
                { method: "DELETE" }
              );
              if (res.ok) {
                li.remove();
                // Update spots count
                const spotsEl = activityCard.querySelector(".spots-badge");
                if (spotsEl) {
                  const current = parseInt(spotsEl.textContent);
                  const newCount = current + 1;
                  spotsEl.textContent = `${newCount} spot${newCount !== 1 ? "s" : ""} left`;
                  spotsEl.className = `spots-badge spots-open`;
                }
                // Show empty state if no participants left
                const list = activityCard.querySelector(".participants-list");
                if (list && list.querySelectorAll("li:not(.no-participants)").length === 0) {
                  list.innerHTML = `<li class="no-participants">No participants yet — be the first!</li>`;
                }
              }
            } catch (err) {
              console.error("Error unregistering participant:", err);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
