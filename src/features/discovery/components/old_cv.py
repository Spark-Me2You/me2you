#!/usr/bin/env python3
"""
Emoji Reactor - A real-time camera-based emoji display application
Uses MediaPipe for hand detection (peace sign), pose detection (hands up), and face mesh detection (smiling)
Displays different emojis based on your actions and expressions.
"""

import cv2
import mediapipe as mp
import numpy as np
import os 
import glob
import random

import pymongo
from pymongo import MongoClient
from dotenv import load_dotenv
import threading

# --- SETUP AND INITIALIZATION ---

# Initialize MediaPipe modules
mp_pose = mp.solutions.pose
mp_hands = mp.solutions.hands
mp_face_mesh = mp.solutions.face_mesh
mp_drawing = mp.solutions.drawing_utils

# --- CONFIGURATION CONSTANTS ---
SMILE_THRESHOLD = 0.25  # Adjust this value based on your smile sensitivity
# MacBook Pro screen is typically 1440x900 or 1680x1050, so half would be around 720x450 or 840x525
WINDOW_WIDTH = 720
WINDOW_HEIGHT = 450
EMOTE_WINDOW_SIZE = (WINDOW_WIDTH, WINDOW_HEIGHT)

# Resolve paths relative to this script so running from any CWD works
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SMILE_DIR = os.path.join(BASE_DIR, "SMILE_DIR")
STRAIGHT_DIR = os.path.join(BASE_DIR, "STRAIGHT_DIR")
PEACE_DIR = os.path.join(BASE_DIR, "PEACE_DIR")
WAVE_DIR = os.path.join(BASE_DIR, "WAVE_DIR")

# Pull and write images from mongo

load_dotenv()
MONGO_URI = os.getenv('MONGO_URI')

if not MONGO_URI:
    print("ERROR: MONGO_URI environment variable is not set!")
    exit(1)

try:
    client = MongoClient(MONGO_URI)
    
    # Test the connection
    client.admin.command('ping')
    print("Connected to MongoDB successfully")
    db_list = client.list_database_names()
    db = client['app']
    
    # Connect to the images collection
    images_collection = db['images']
    doc_count = images_collection.count_documents({})
    
    if doc_count == 0:
        print("The 'images' collection is empty!")
    else:
        
        # CATEGORY LIST HERE
        for cat in ['peace', 'smile', 'wave']:
            output_dir = os.path.join(BASE_DIR, cat.upper() + "_DIR")
            
            matches = images_collection.find({"category": cat})
            os.makedirs(output_dir, exist_ok=True)  # Create the directory if it doesn't exist
            
            for doc in matches:
                # Grab image (binary)
                if "image_data" not in doc:
                    print(f"Warning: Document {doc['_id']} missing image_data field")
                    continue
                    
                imgdata = doc["image_data"]
                
                # Use doc id as filename
                filename = f"{doc['_id']}.jpg"
                
                # Join with output directory to write to correct location
                output_path = os.path.join(output_dir, filename)
                
                with open(output_path, "wb") as f:
                    f.write(imgdata)
                
except Exception as e:
    print(f"ERROR: {e}")


# --- MONGODB CHANGE STREAMS FOR REAL-TIME UPDATES ---
def export_single_image(doc):
    
    try:
        category = doc.get('category')
        if category not in ['peace', 'smile', 'wave']:
            return
            
        if "image_data" not in doc:
            print(f"Warning: Document {doc['_id']} missing image_data field")
            return
            
        output_dir = os.path.join(BASE_DIR, category.upper() + "_DIR")
        os.makedirs(output_dir, exist_ok=True)
        
        imgdata = doc["image_data"]
        filename = f"{doc['_id']}.jpg"
        output_path = os.path.join(output_dir, filename)
        
        with open(output_path, "wb") as f:
            f.write(imgdata)
        
        # Update the name dictionary if the document has a name
        doc_id = str(doc['_id'])
        name = doc.get('name', '')
        if name and name.strip():
            name_dictionary[doc_id] = name.strip()
            print(f"Updated name dictionary: {doc_id} -> {name}")
        
        print(f"Exported new {category} image: {filename}")
        
    except Exception as e:
        print(f"Error exporting image: {e}")

def delete_single_image(doc_id):
    
    try:
        filename = f"{doc_id}.jpg"
        deleted_any = False
        
        # Check both peace and smile directories
        for category in ['peace', 'smile', 'wave']:
            output_dir = os.path.join(BASE_DIR, category.upper() + "_DIR")
            file_path = os.path.join(output_dir, filename)
            
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"Deleted {category} image: {filename}")
                deleted_any = True
        
        # Remove from name dictionary
        doc_id_str = str(doc_id)
        if doc_id_str in name_dictionary:
            del name_dictionary[doc_id_str]
            print(f"Removed from name dictionary: {doc_id_str}")
        
        if not deleted_any:
            print(f"Warning: File {filename} not found in any category directory")
            
    except Exception as e:
        print(f"Error deleting image: {e}")

def watch_for_image_changes():

    try:
        print("Starting MongoDB Change Stream watcher...")
        
        # Create a change stream to watch for inserts, updates, and deletes
        with images_collection.watch([
            {'$match': {
                'operationType': {'$in': ['insert', 'update', 'delete']},
                '$or': [
                    {'fullDocument.category': {'$in': ['peace', 'smile', 'wave']}},  # For inserts/updates
                    {'operationType': 'delete'}  # For deletes (no fullDocument available)
                ]
            }}
        ]) as stream:
            
            for change in stream:
                operation_type = change['operationType']
                
                if operation_type == 'insert':
                    doc = change.get('fullDocument')
                    category = doc.get('category')
                    if category in ['peace', 'smile', 'wave']:
                        print(f"New image detected: {category} - {doc.get('_id')}")
                        export_single_image(doc)
                    
                elif operation_type == 'update':
                    doc_id = change['documentKey']['_id']
                    print(f"Image updated: {doc_id}")
                    # For updates, we need to fetch the full document
                    updated_doc = images_collection.find_one({'_id': doc_id})
                    if updated_doc and updated_doc.get('category') in ['peace', 'smile', 'wave']:
                        export_single_image(updated_doc)
                        
                elif operation_type == 'delete':
                    doc_id = change['documentKey']['_id']
                    print(f"Image deleted: {doc_id}")
                    delete_single_image(doc_id)
                        
    except Exception as e:
        print(f"Change Stream error: {e}")

def start_change_stream_watcher():
    """Start the change stream watcher in a background thread"""
    def run_watcher():
        watch_for_image_changes()
    
    watcher_thread = threading.Thread(target=run_watcher, daemon=True)
    watcher_thread.start()
    print("MongoDB Change Stream watcher started in background")
    return watcher_thread

# Start the change stream watcher
change_stream_thread = start_change_stream_watcher()

# Dictionary to store ID to name mappings for performance optimization
name_dictionary = {}

def load_name_dictionary():
    """Load all MongoDB document IDs and their corresponding names into a dictionary"""
    global name_dictionary
    try:
        print("Loading name dictionary from MongoDB...")
        # Get all documents that have names
        docs = images_collection.find({}, {'_id': 1, 'name': 1})
        
        for doc in docs:
            doc_id = str(doc['_id'])
            name = doc.get('name', '')
            
            # Only add to dictionary if name exists and is not empty
            if name and name.strip():
                name_dictionary[doc_id] = name.strip()
        
        print(f"Loaded {len(name_dictionary)} names into dictionary")
        return name_dictionary
        
    except Exception as e:
        print(f"Error loading name dictionary: {e}")
        return {}

def get_name_from_dictionary(image_path):
    """Get name from dictionary using the image filename"""
    try:
        # Extract the MongoDB ID from the filename
        filename = os.path.basename(image_path)
        doc_id = filename.replace('.jpg', '').replace('.png', '').replace('.jpeg', '')
        
        # Look up in dictionary
        return name_dictionary.get(doc_id, '')
        
    except Exception as e:
        print(f"Error getting name from dictionary: {e}")
        return ''

def add_text_overlay(frame, text, position=None):
    """Add text overlay to frame in the bottom right corner with black background"""
    if not text:
        return frame
    
    # Set up text properties - simple and clean
    font = cv2.FONT_HERSHEY_SIMPLEX  # Standard font, no special styling
    font_scale = 1.8
    thickness = 2
    color = (255, 255, 255)  # White text
    bg_color = (0, 0, 0)  # Black background
    
    # Calculate text size to position it properly
    (text_width, text_height), baseline = cv2.getTextSize(text, font, font_scale, thickness)
    
    # Position in bottom right corner but not all the way - leave some margin
    if position is None:
        frame_height, frame_width = frame.shape[:2]
        x = frame_width - text_width - 50  # 50 pixels from right edge
        y = frame_height - 30  # 30 pixels from bottom edge
    else:
        x, y = position
    
    # Add padding around text for background rectangle
    padding = 8
    bg_x1 = x - padding
    bg_y1 = y - text_height - padding
    bg_x2 = x + text_width + padding
    bg_y2 = y + baseline + padding
    
    # Draw black background rectangle
    cv2.rectangle(frame, (bg_x1, bg_y1), (bg_x2, bg_y2), bg_color, -1)
    
    # Add white text on top of black background
    cv2.putText(frame, text, (x, y), font, font_scale, color, thickness)
    
    return frame

# Load the name dictionary at startup
load_name_dictionary()


# --- LOAD AND PREPARE EMOJI IMAGES ---
def load_random_image_from_folder(folder_path):
    """Randomly select an image from a folder and return it as a resized cv2 image."""
    # Get all valid image files (png, jpg, jpeg)
    valid_exts = (".png", ".jpg", ".jpeg")
    image_files = [f for f in os.listdir(folder_path) if f.lower().endswith(valid_exts)]

    print(image_files)
    if not image_files:
        raise FileNotFoundError(f"No images found in folder: {folder_path}")

    # Pick one at random
    random_image = random.choice(image_files)
    image_path = os.path.join(folder_path, random_image)

    # Read the image
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Could not read image: {image_path}")

    # Resize it
    img = cv2.resize(img, EMOTE_WINDOW_SIZE)
    return img, random_image

# Try to load from folders first; fall back to files
try:
    # Smiling
    if os.path.isdir(SMILE_DIR):
        smiling_emoji, smile_file = load_random_image_from_folder(SMILE_DIR)
    else:
        smile_path = os.path.join(BASE_DIR, "smile.jpg")
        smiling_emoji = cv2.imread(smile_path)
        if smiling_emoji is None:
            raise FileNotFoundError(f"smile.jpg not found at {smile_path}")
        smiling_emoji = cv2.resize(smiling_emoji, EMOTE_WINDOW_SIZE)
        smile_file = os.path.basename(smile_path)

    # Straight
    if os.path.isdir(STRAIGHT_DIR):
        straight_face_emoji, straight_file = load_random_image_from_folder(STRAIGHT_DIR)
    else:
        straight_path = os.path.join(BASE_DIR, "plain.png")
        straight_face_emoji = cv2.imread(straight_path)
        if straight_face_emoji is None:
            raise FileNotFoundError(f"plain.png not found at {straight_path}")
        straight_face_emoji = cv2.resize(straight_face_emoji, EMOTE_WINDOW_SIZE)
        straight_file = os.path.basename(straight_path)

    # Peace
    if os.path.isdir(PEACE_DIR):
        peace_sign_emoji, peace_file = load_random_image_from_folder(PEACE_DIR)
    else:
        peace_candidates = [
            os.path.join(BASE_DIR, "hamsterpeace.jpeg"),
            os.path.join(BASE_DIR, "air.jpg"),
            os.path.join(BASE_DIR, "peace.jpg"),
            os.path.join(BASE_DIR, "peace.png"),
        ]
        peace_sign_emoji = None
        peace_file = None
        for p in peace_candidates:
            peace_sign_emoji = cv2.imread(p)
            if peace_sign_emoji is not None:
                peace_sign_emoji = cv2.resize(peace_sign_emoji, EMOTE_WINDOW_SIZE)
                peace_file = os.path.basename(p)
                break
        if peace_sign_emoji is None:
            raise FileNotFoundError("No peace image found. Tried: " + ", ".join(os.path.basename(x) for x in peace_candidates))

    # Wave
    if os.path.isdir(WAVE_DIR):
        wave_emoji, wave_file = load_random_image_from_folder(WAVE_DIR)
    else:
        wave_candidates = [
            os.path.join(BASE_DIR, "wave.jpg"),
            os.path.join(BASE_DIR, "wave.png"),
            os.path.join(BASE_DIR, "waving.jpg"),
            os.path.join(BASE_DIR, "waving.png"),
        ]
        wave_emoji = None
        wave_file = None
        for p in wave_candidates:
            wave_emoji = cv2.imread(p)
            if wave_emoji is not None:
                wave_emoji = cv2.resize(wave_emoji, EMOTE_WINDOW_SIZE)
                wave_file = os.path.basename(p)
                break
        if wave_emoji is None:
            raise FileNotFoundError("No wave image found. Tried: " + ", ".join(os.path.basename(x) for x in wave_candidates))

    print(f"Loaded smile emoji: {smile_file}")
    print(f"Loaded straight emoji: {straight_file}")
    print(f"Loaded peace emoji: {peace_file}")
    print(f"Loaded wave emoji: {wave_file}")

except Exception as e:
    print("Error loading emoji images! Make sure they are in the correct folder and named properly.")
    print(f"Error details: {e}")
    print("\nPlace files next to this script or use the folders:")
    print("- Folder 'SMILE_DIR' with images (optional), else 'smile.jpg'")
    print("- Folder 'STRAIGHT_DIR' with images (optional), else 'plain.png'")
    print("- Folder 'PEACE_DIR' with images (optional), else one of: hamsterpeace.jpeg, air.jpg, peace.jpg, peace.png")
    print("- Folder 'WAVE_DIR' with images (optional), else one of: wave.jpg, wave.png, waving.jpg, waving.png")
    exit()

# Create a blank image for cases where an emoji is missing
blank_emoji = np.zeros((WINDOW_HEIGHT, WINDOW_WIDTH, 3), dtype=np.uint8)

# --- HELPER FUNCTIONS ---

def is_peace_sign(hand_landmarks):
    """
    Detect if the hand is making a peace sign
    Peace sign = index and middle fingers extended, ring and pinky fingers folded
    """
    landmarks = hand_landmarks.landmark
    
    # Get finger tip and pip (middle joint) coordinates
    index_tip = landmarks[8]
    index_pip = landmarks[6]
    middle_tip = landmarks[12]
    middle_pip = landmarks[10]
    ring_tip = landmarks[16]
    ring_pip = landmarks[14]
    pinky_tip = landmarks[20]
    pinky_pip = landmarks[18]
    
    # Check if index and middle fingers are extended (tips above pips in y-coordinate)
    # Remember: in MediaPipe, y=0 is at the top, y=1 at bottom
    index_extended = index_tip.y < index_pip.y
    middle_extended = middle_tip.y < middle_pip.y
    
    # Check if ring and pinky are folded (tips below pips)
    ring_folded = ring_tip.y > ring_pip.y
    pinky_folded = pinky_tip.y > pinky_pip.y
    
    # Peace sign = index and middle extended, ring and pinky folded
    return index_extended and middle_extended and ring_folded and pinky_folded

def is_wave(hand_landmarks):
    """
    Detect if the hand is making a wave gesture (all five fingers extended)
    More robust wave detection with better thumb handling
    """
    landmarks = hand_landmarks.landmark
    
    # Get key landmarks
    wrist = landmarks[0]
    
    # Finger tips and middle joints
    fingers = [
        (landmarks[4], landmarks[3]),   # Thumb (tip, ip)
        (landmarks[8], landmarks[6]),   # Index (tip, pip)
        (landmarks[12], landmarks[10]), # Middle (tip, pip)
        (landmarks[16], landmarks[14]), # Ring (tip, pip)
        (landmarks[20], landmarks[18])  # Pinky (tip, pip)
    ]
    
    extended_count = 0
    
    for i, (tip, joint) in enumerate(fingers):
        if i == 0:  # Thumb - special case
            # Check if thumb tip is further from palm center than joint
            palm_center = landmarks[9]  # Middle finger MCP joint as palm reference
            thumb_dist_tip = ((tip.x - palm_center.x)**2 + (tip.y - palm_center.y)**2)**0.5
            thumb_dist_joint = ((joint.x - palm_center.x)**2 + (joint.y - palm_center.y)**2)**0.5
            if thumb_dist_tip > thumb_dist_joint:
                extended_count += 1
        else:  # Other fingers - tip above joint
            if tip.y < joint.y:
                extended_count += 1
    
    # Require at least 4 out of 5 fingers to be extended (allows for some detection noise)
    return extended_count >= 4

# --- MAIN LOGIC ---

# Start webcam capture
print("Starting webcam capture...")
cap = cv2.VideoCapture(0)

# Check if webcam is available
if not cap.isOpened():
    print("Error: Could not open webcam. Make sure your camera is connected and not being used by another application.")
    exit()

# Initialize named windows with specific sizes
cv2.namedWindow('Emoji Output', cv2.WINDOW_NORMAL)
cv2.namedWindow('Camera Feed', cv2.WINDOW_NORMAL)

# Set window sizes and positions
cv2.resizeWindow('Camera Feed', WINDOW_WIDTH, WINDOW_HEIGHT)
cv2.resizeWindow('Emoji Output', WINDOW_WIDTH, WINDOW_HEIGHT)

# Position windows side by side
cv2.moveWindow('Camera Feed', 100, 100)
cv2.moveWindow('Emoji Output', WINDOW_WIDTH + 150, 100)

print("Starting emoji detection...")
print("Controls:")
print("   - Press 'q' to quit")
print("   - Make a peace sign for hands up emoji")
print("   - Smile for smiling emoji")
print("   - Keep a straight face for straight face emoji")

# Instantiate MediaPipe models
with mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose, \
     mp_hands.Hands(max_num_hands=2, min_detection_confidence=0.5, min_tracking_confidence=0.5) as hands, \
     mp_face_mesh.FaceMesh(max_num_faces=1, min_detection_confidence=0.5) as face_mesh:
    # Track previous state and keep currently displayed emoji to avoid flicker
    previous_state = None
    emoji_to_display = blank_emoji
    emoji_name = ""

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            print("Ignoring empty camera frame.")
            continue

        # Flip the frame horizontally for a mirror-like display
        frame = cv2.flip(frame, 1)
        
        # Convert the BGR image to RGB for MediaPipe
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # To improve performance, mark the image as not writeable
        image_rgb.flags.writeable = False

        # --- DETECTION LOGIC ---
        
        # Default state is a straight face
        current_state = "STRAIGHT_FACE"

        # 1. Process for Hand Detection - This has the highest priority
        results_hands = hands.process(image_rgb)
        if results_hands.multi_hand_landmarks:
            for hand_landmarks in results_hands.multi_hand_landmarks:
                if is_wave(hand_landmarks):
                    current_state = "WAVING"
                    break
                elif is_peace_sign(hand_landmarks):
                    current_state = "PEACE_SIGN"  
                    break
        
        # ======================================================================
        # 2A. FACIAL EXPRESSION DETECTION - METHOD 1: MOUTH ASPECT RATIO (ORIGINAL)
        # ======================================================================
        # Comment out this entire section to use Method 2 instead
        # if current_state != "PEACE_SIGN":
        #      results_face = face_mesh.process(image_rgb)
        #      if results_face.multi_face_landmarks:
        #          for face_landmarks in results_face.multi_face_landmarks:
        #              # Mouth corner landmarks
        #              left_corner = face_landmarks.landmark[291]
        #              right_corner = face_landmarks.landmark[61]
        #              # Upper and lower lip landmarks
        #              upper_lip = face_landmarks.landmark[13]
        #              lower_lip = face_landmarks.landmark[14]
        
        #              # Calculate mouth aspect ratio to detect a smile
        #              mouth_width = ((right_corner.x - left_corner.x)**2 + (right_corner.y - left_corner.y)**2)**0.5
        #              mouth_height = ((lower_lip.x - upper_lip.x)**2 + (lower_lip.y - upper_lip.y)**2)**0.5
                     
        #              if mouth_width > 0:  # Avoid division by zero
        #                  mouth_aspect_ratio = mouth_height / mouth_width
        #                  if mouth_aspect_ratio > SMILE_THRESHOLD:
        #                      current_state = "SMILING"
        #                  else:
        #                      current_state = "STRAIGHT_FACE"
        if current_state not in ["WAVING", "PEACE_SIGN"]:
             results_face = face_mesh.process(image_rgb)
             if results_face.multi_face_landmarks:
                 for face_landmarks in results_face.multi_face_landmarks:
                     # Mouth corner landmarks
                     left_corner = face_landmarks.landmark[291]
                     right_corner = face_landmarks.landmark[61]
                     # Upper and lower lip landmarks
                     upper_lip = face_landmarks.landmark[13]
                     lower_lip = face_landmarks.landmark[14]
        
                     # Calculate mouth aspect ratio to detect a smile
                     mouth_width = ((right_corner.x - left_corner.x)**2 + (right_corner.y - left_corner.y)**2)**0.5
                     mouth_height = ((lower_lip.x - upper_lip.x)**2 + (lower_lip.y - upper_lip.y)**2)**0.5
                     mouth_center_y = (upper_lip.y + lower_lip.y) / 2
                     left_lift = mouth_center_y - left_corner.y
                     right_lift = mouth_center_y - right_corner.y
                     avg_lip_lift = (left_lift + right_lift) / 2
        
                     if mouth_width > 0:  # Avoid division by zero
                         mouth_aspect_ratio = mouth_height / mouth_width
                         SMILE_AR_THRESHOLD = 0.25  # Adjust this value based on your smile sensitivity
                         LIP_LIFT_THRESHOLD = 0.015  # Adjust this value based on your smile sensitivity
                         WIDE_MOUTH_THRESHOLD = 0.18  # Adjust this value based on your smile sensitivity
                         if mouth_aspect_ratio > SMILE_AR_THRESHOLD or \
                            (avg_lip_lift > LIP_LIFT_THRESHOLD and mouth_aspect_ratio > WIDE_MOUTH_THRESHOLD):
                             current_state = "SMILING"
                         else:
                             current_state = "STRAIGHT_FACE"
        # ======================================================================
        # 2B. FACIAL EXPRESSION DETECTION - METHOD 2: MULTI-FACTOR (ADVANCED)
        # ======================================================================
        # Comment out this entire section to use Method 1 instead
        # if current_state != "PEACE_SIGN":
        #     results_face = face_mesh.process(image_rgb)
        #     if results_face.multi_face_landmarks:
        #         for face_landmarks in results_face.multi_face_landmarks:
        #             # Key landmarks for smile detection
        #             left_corner = face_landmarks.landmark[291]   # Left mouth corner
        #             right_corner = face_landmarks.landmark[61]   # Right mouth corner
        #             nose_tip = face_landmarks.landmark[1]        # Nose tip (reference point)
        #             left_cheek = face_landmarks.landmark[116]    # Left cheek
        #             right_cheek = face_landmarks.landmark[345]   # Right cheek
        #             upper_lip_center = face_landmarks.landmark[13]  # Upper lip center
                    
        #             # Method 1: Corner elevation relative to nose
        #             # When smiling, mouth corners rise relative to nose tip
        #             left_corner_elevation = nose_tip.y - left_corner.y
        #             right_corner_elevation = nose_tip.y - right_corner.y
        #             avg_corner_elevation = (left_corner_elevation + right_corner_elevation) / 2
                    
        #             # Method 2: Cheek displacement
        #             # When smiling, cheeks move up and outward
        #             cheek_displacement = ((left_cheek.y + right_cheek.y) / 2) - upper_lip_center.y
                    
        #             # Method 3: Corner width spread
        #             # Smiles tend to widen the mouth
        #             corner_width = ((right_corner.x - left_corner.x)**2 + (right_corner.y - left_corner.y)**2)**0.5
                    
        #             # Combined smile detection with multiple factors
        #             # Adjust these thresholds based on testing (0.02-0.05 works well)
        #             elevation_threshold = 0.035
        #             cheek_threshold = -0.02
        #             width_threshold = 0.08
                    
        #             is_smiling = (avg_corner_elevation > elevation_threshold or 
        #                         cheek_displacement < cheek_threshold or 
        #                         corner_width > width_threshold)
                    
        #             if is_smiling:
        #                 current_state = "SMILING"
        #             else:
        #                 current_state = "STRAIGHT_FACE"
        
        # --- DISPLAY LOGIC ---
        # Only change the displayed image when the state changes
        if current_state != previous_state:
            current_image_path = None  # Track current image path for name lookup
            
            if current_state == "SMILING":
                smile_dir = os.path.join(BASE_DIR, "SMILE_DIR")
                if os.path.isdir(smile_dir):
                    emoji_to_display, current_filename = load_random_image_from_folder(smile_dir)
                    current_image_path = os.path.join(smile_dir, current_filename)
                else:
                    emoji_to_display = smiling_emoji
                emoji_name = "SMILING"
            elif current_state == "STRAIGHT_FACE":
                straight_dir = os.path.join(BASE_DIR, "STRAIGHT_DIR")
                if os.path.isdir(straight_dir):
                    emoji_to_display, current_filename = load_random_image_from_folder(straight_dir)
                    current_image_path = os.path.join(straight_dir, current_filename)
                else:
                    emoji_to_display = straight_face_emoji
                emoji_name = "STRAIGHT"
            elif current_state == "PEACE_SIGN":
                peace_dir = os.path.join(BASE_DIR, "PEACE_DIR")
                if os.path.isdir(peace_dir):
                    emoji_to_display, current_filename = load_random_image_from_folder(peace_dir)
                    current_image_path = os.path.join(peace_dir, current_filename)
                else:
                    emoji_to_display = peace_sign_emoji
                emoji_name = "PEACE"
            elif current_state == "WAVING":
                wave_dir = os.path.join(BASE_DIR, "WAVE_DIR")
                if os.path.isdir(wave_dir):
                    emoji_to_display, current_filename = load_random_image_from_folder(wave_dir)
                    current_image_path = os.path.join(wave_dir, current_filename)
                else:
                    emoji_to_display = wave_emoji
                emoji_name = " "
            else:
                emoji_to_display = blank_emoji
                emoji_name = "UNKNOWN"
            
            # Get the user name from dictionary and add text overlay
            if current_image_path:
                user_name = get_name_from_dictionary(current_image_path)
                if user_name:
                    emoji_to_display = add_text_overlay(emoji_to_display.copy(), user_name)
                    print(f"Displaying image with name: {user_name}")
                    
            previous_state = current_state
            

        # if current_state == "SMILING":
        #     emoji_to_display = smiling_emoji
        #     emoji_name = "😊"
        # elif current_state == "STRAIGHT_FACE":
        #     emoji_to_display = straight_face_emoji
        #     emoji_name = "😐"
        # elif current_state == "PEACE_SIGN":
        #     emoji_to_display = peace_sign_emoji
        #     emoji_name = "🙌"
        # else:
        #     emoji_to_display = blank_emoji
        #     emoji_name = "❓"

        # Resize camera frame to match window size
        camera_frame_resized = cv2.resize(frame, (WINDOW_WIDTH, WINDOW_HEIGHT))
        


        # Display the camera feed and emoji
        cv2.imshow('Camera Feed', camera_frame_resized)
        cv2.imshow('Emoji Output', emoji_to_display)

        # Exit loop if 'q' is pressed
        if cv2.waitKey(5) & 0xFF == ord('q'):
            break

# --- CLEANUP ---
print("Shutting down...")
cap.release()
cv2.destroyAllWindows()

# Close MongoDB connection
try:
    client.close()
    print("MongoDB connection closed")
except:
    pass

print("Application closed successfully!")
