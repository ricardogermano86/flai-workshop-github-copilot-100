"""
Tests for the Mergington High School Activities API
"""

import copy
import pytest
from fastapi.testclient import TestClient
from src.app import app, activities


@pytest.fixture(autouse=True)
def reset_activities():
    """Restore the in-memory activities state after each test."""
    original = {name: {**data, "participants": list(data["participants"])}
                for name, data in activities.items()}
    yield
    activities.clear()
    activities.update(original)


client = TestClient(app)


# ---------------------------------------------------------------------------
# GET /activities
# ---------------------------------------------------------------------------

class TestGetActivities:
    def test_returns_200(self):
        response = client.get("/activities")
        assert response.status_code == 200

    def test_returns_all_activities(self):
        response = client.get("/activities")
        data = response.json()
        assert len(data) == 9

    def test_activity_has_required_fields(self):
        response = client.get("/activities")
        for activity in response.json().values():
            assert "description" in activity
            assert "schedule" in activity
            assert "max_participants" in activity
            assert "participants" in activity

    def test_chess_club_is_present(self):
        response = client.get("/activities")
        assert "Chess Club" in response.json()


# ---------------------------------------------------------------------------
# POST /activities/{activity_name}/signup
# ---------------------------------------------------------------------------

class TestSignup:
    def test_successful_signup(self):
        response = client.post(
            "/activities/Chess%20Club/signup?email=newstudent@mergington.edu"
        )
        assert response.status_code == 200
        assert "newstudent@mergington.edu" in response.json()["message"]

    def test_signup_adds_participant(self):
        email = "newstudent@mergington.edu"
        client.post(f"/activities/Chess%20Club/signup?email={email}")
        assert email in activities["Chess Club"]["participants"]

    def test_signup_unknown_activity_returns_404(self):
        response = client.post(
            "/activities/Unknown%20Activity/signup?email=x@mergington.edu"
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Activity not found"

    def test_signup_duplicate_returns_400(self):
        email = "michael@mergington.edu"  # already in Chess Club
        response = client.post(f"/activities/Chess%20Club/signup?email={email}")
        assert response.status_code == 400
        assert response.json()["detail"] == "Student is already signed up"

    def test_signup_decrements_spots(self):
        before = len(activities["Chess Club"]["participants"])
        client.post("/activities/Chess%20Club/signup?email=extra@mergington.edu")
        after = len(activities["Chess Club"]["participants"])
        assert after == before + 1


# ---------------------------------------------------------------------------
# DELETE /activities/{activity_name}/signup
# ---------------------------------------------------------------------------

class TestUnregister:
    def test_successful_unregister(self):
        email = "michael@mergington.edu"  # already in Chess Club
        response = client.delete(f"/activities/Chess%20Club/signup?email={email}")
        assert response.status_code == 200
        assert email in response.json()["message"]

    def test_unregister_removes_participant(self):
        email = "michael@mergington.edu"
        client.delete(f"/activities/Chess%20Club/signup?email={email}")
        assert email not in activities["Chess Club"]["participants"]

    def test_unregister_unknown_activity_returns_404(self):
        response = client.delete(
            "/activities/Unknown%20Activity/signup?email=x@mergington.edu"
        )
        assert response.status_code == 404
        assert response.json()["detail"] == "Activity not found"

    def test_unregister_not_enrolled_returns_400(self):
        response = client.delete(
            "/activities/Chess%20Club/signup?email=nothere@mergington.edu"
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Student is not signed up for this activity"

    def test_signup_then_unregister_roundtrip(self):
        email = "roundtrip@mergington.edu"
        client.post(f"/activities/Chess%20Club/signup?email={email}")
        assert email in activities["Chess Club"]["participants"]

        client.delete(f"/activities/Chess%20Club/signup?email={email}")
        assert email not in activities["Chess Club"]["participants"]
