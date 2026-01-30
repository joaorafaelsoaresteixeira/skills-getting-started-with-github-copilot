import os
import sys
import copy

# ensure src is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from fastapi.testclient import TestClient
import pytest

from app import app, activities

client = TestClient(app)


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # known activity from seed data
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "pytest-user@example.com"

    # ensure clean start
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # signup
    res = client.post(f"/activities/{activity}/signup?email={email}")
    assert res.status_code == 200
    assert email in activities[activity]["participants"]

    # duplicate signup should fail
    res_dup = client.post(f"/activities/{activity}/signup?email={email}")
    assert res_dup.status_code == 400

    # GET /activities should reflect new participant
    res_all = client.get("/activities")
    assert res_all.status_code == 200
    data = res_all.json()
    assert email in data[activity]["participants"]

    # unregister
    res_un = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res_un.status_code == 200
    assert email not in activities[activity]["participants"]

    # unregistering again should return 404
    res_un2 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res_un2.status_code == 404


def test_signup_nonexistent_activity():
    res = client.post("/activities/NoSuchActivity/signup?email=a@b.com")
    assert res.status_code == 404
