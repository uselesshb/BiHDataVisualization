#this script creates relations.js and nodes.js used by the application


import requests
import xml.etree.ElementTree as ET
import json
import os
import math
import sys

def main():
    with open("relations_list.json", "r", encoding="utf8") as infile:
        relations_list = json.load(infile)

    all_nodes = {}
    duplicate_nodes_count = [0]

    with open("relations.js", "w") as outfile:
        outfile.write("const relations=[")

    get_data(relations_list, all_nodes, duplicate_nodes_count)

    with open("relations.js", "a") as outfile:
        outfile.write("]")

    with open("nodes.js", "a") as outfile:
        outfile.write("const nodes={")
        for node_idx, node_id in enumerate(all_nodes):
            outfile.write(str(node_id) + ":[" + str(all_nodes[node_id][0]) + "," + str(all_nodes[node_id][1]) + "]")
            if node_idx < len(all_nodes) - 1:
                outfile.write(",")  
        outfile.write("}")

    print("Total nodes: " + str(len(all_nodes)) + ", duplicate nodes not added: " + str(duplicate_nodes_count[0]))

def get_data(relations_list, all_nodes, duplicate_nodes_count):
    for relation_idx, relation in enumerate(relations_list):
        print("Getting relation " + str(relation_idx+1) + "/" + str(len(relations_list)) + " " + str(relation["name"]))

        req = requests.get("https://www.openstreetmap.org/api/0.6/relation/" + relation["relation_id"] + "/full")
        tree = ET.ElementTree(ET.fromstring(req.content))
        osm = tree.getroot()
        
        json_data = {
            "name": "",
            "admin_level": "",
            "relation_id": "",
            "parent_relation_id": "",
            "polygons": []
        }

        relation_tag = osm.find("relation")
        ways_tags = osm.findall("way")
        nodes_tags = osm.findall("node")

        json_data["name"] = relation["name"]
        json_data["relation_id"] = relation["relation_id"]
        json_data["parent_relation_id"] = relation["parent_relation_id"]
        json_data["admin_level"] = [tag.get("v") for tag in relation_tag.findall("tag") if tag.get("k") == "admin_level"][0]

        ways_with_nodes = {}

        for way_tag in ways_tags:
            way_id = way_tag.get("id")
            ways_with_nodes[way_id] = [nd.get("ref") for nd in way_tag.findall("nd")]

        for node_tag in nodes_tags:
            node_id = node_tag.get("id")
            if node_id not in all_nodes:
                all_nodes[node_id] = from_lon_lat(float(node_tag.get("lon")), float(node_tag.get("lat")))
            else:
                duplicate_nodes_count[0] = duplicate_nodes_count[0] + 1
                
        polygons = []

        make_polygons(ways_with_nodes, polygons)

        json_data["polygons"] = polygons

        with open("relations.js", "a", encoding="utf8") as outfile:
            outfile.write("{name:\"" + json_data["name"] + "\", admin_level:" + json_data["admin_level"] + ", relation_id:" + json_data["relation_id"]  + ", parent_relation_id:" + json_data["parent_relation_id"]+ ",polygons:[")
            for polygon_idx, polygon in enumerate(json_data["polygons"]):
                outfile.write("[[")
                for node_idx, node in enumerate(polygon):
                    outfile.write("nodes[" + str(node) + "]")
                    if node_idx < len(polygon) - 1:
                        outfile.write(",")  
                outfile.write("]]")
                if polygon_idx < len(json_data["polygons"]) - 1:
                    outfile.write(",")
            outfile.write("]}")
            if relation_idx < len(relations_list) - 1:
                outfile.write(",")
        
def make_polygons(ways_with_nodes, polygons):
    polygons.append([])
    initial_way = ways_with_nodes.popitem()
    polygons[-1].extend(initial_way[1])

    while len(ways_with_nodes) > 0:

        last_node_in_current_polygon = polygons[-1][-1]
        found = False

        for way in ways_with_nodes:

            first_node_in_current_way = ways_with_nodes[way][0]
            last_node_in_current_way = ways_with_nodes[way][-1]

            if last_node_in_current_polygon == first_node_in_current_way:
                polygons[-1].extend(ways_with_nodes.pop(way)[1:])
                found = True
                break
            elif last_node_in_current_polygon == last_node_in_current_way:
                reversed_list = ways_with_nodes.pop(way)
                reversed_list.reverse()
                polygons[-1].extend(reversed_list[1:])
                found = True
                break
        
        if not found:
            print("Could not find where to continue node " + last_node_in_current_polygon)
            sys.exit()

        
        if polygons[-1][0] == polygons[-1][-1]:
            #polygon connected
            polygons[-1] = polygons[-1][:-1]
            if len(ways_with_nodes) > 0:
                #add another
                polygons.append([])
                another_initial_way = ways_with_nodes.popitem()
                polygons[-1].extend(another_initial_way[1])

def from_lon_lat(lon, lat):
    radius = 6378137
    half_size = math.pi * radius

    x = half_size * lon / 180
    y = radius * math.log(math.tan(math.pi * (lat + 90) / 360))

    if y > half_size:
        y = half_size
    elif y < -half_size:
        y = -half_size
        
    return [round(x, 3), round(y, 3)]

if __name__ == "__main__":
    main()