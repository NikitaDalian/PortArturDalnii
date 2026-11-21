"""Regenerate map overlays from measured scan controls and their independent checkpoints.

Run from the archive workspace with its existing full-resolution work/archive_finds scans.
Image coordinates are pixels on an uncropped reproduction rescaled to the indicated width.
The fitting plane is spherical Web Mercator with its y-axis pointing down the image.
"""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

SITE = Path(__file__).resolve().parents[1]
ARCHIVE = SITE.parent / "work/archive_finds"
PUBLIC = SITE / "public"
REGISTRY = SITE / "src/components/map/registrations.json"
RADIUS = 6378137


def project(lon, lat):
    return complex(math.radians(lon), -math.asinh(math.tan(math.radians(lat)))) * RADIUS


def lonlat(point):
    lon = math.degrees(point.real / RADIUS)
    lat = math.degrees(math.atan(math.sinh(-point.imag / RADIUS)))
    return [round(lon, 7), round(lat, 7)]


def tile_point(zoom, tile_x, tile_y, x, y):
    size = 2 ** zoom
    lon = (tile_x + x / 256) / size * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (tile_y + y / 256) / size))))
    return (lon, lat)


def december_plan(x, y):
    # Top left, top right and bottom left of the December base (see map/geo.ts).
    origin = project(121.17494, 38.86489)
    across = project(121.33337, 38.86590) - origin
    down = project(121.16177, 38.75199) - origin
    return lonlat(origin + across * (x / 1000) + down * (y / (1127 / 1280 * 1000)))


def fit(photo, dimensions, width, controls, checkpoint):
    pixels, locations = zip(*controls)
    targets = [project(*ll) for ll in locations]
    if len(controls) == 2:
        # A similarity transform preserves angles on city and regional sheets.
        first, last = [complex(*xy) for xy in pixels]
        rotation_scale = (targets[1] - targets[0]) / (last - first)

        def transform(x, y):
            return targets[0] + rotation_scale * (complex(x, y) - first)
    else:
        # Historical shorelines provide three non-collinear matches for an affine fit.
        matrix = [[x, y, 1] for x, y in pixels]
        horizontal, vertical, offset = np.linalg.solve(matrix, targets)

        def transform(x, y):
            return horizontal * x + vertical * y + offset

    height = width * dimensions[1] / dimensions[0]
    corners = [(0, 0), (width, 0), (width, height), (0, height)]
    pixel, location = checkpoint
    ground_offset = abs(transform(*pixel) - project(*location)) * math.cos(math.radians(location[1]))
    return {
        "photo": photo,
        "corners": [lonlat(transform(*xy)) for xy in corners],
        "checkMeters": [round(ground_offset)],
    }


def save_mask(scan, width, polygon, photo):
    factor = scan.width / width
    outline = [(round(x * factor), round(y * factor)) for x, y in polygon]
    alpha = Image.new("L", scan.size, 0)
    ImageDraw.Draw(alpha).polygon(outline, fill=255)
    image = scan.convert("RGB")
    image.putalpha(alpha)
    image.thumbnail((2200, 2200))
    output = PUBLIC / "images/historical-maps"
    output.mkdir(exist_ok=True, parents=True)
    image.save(output / f"{photo}.webp", quality=86, method=5)


def main():
    rows = []

    def add(photo, width, controls, checkpoint):
        with Image.open(PUBLIC / f"img/p/{photo}.webp") as scan:
            rows.append(fit(photo, scan.size, width, controls, checkpoint))

    # Zhongshan and Youhao are controls. Minzhu is held out for verification.
    def dalian(x, y):
        return tile_point(16, 54909, 25064, x, y)

    zhongshan = dalian(685, 269)
    youhao = dalian(489, 348)
    minzhu = dalian(879, -4)
    for photo, width, first, second, check in [
        (312, 1200, (606,627), (531,653), (684,526)),
        (67, 1000, (493,518), (434,537), (551,435)),
        (68, 1000, (493,539), (428,560), (555,447)),
        (365, 1000, (422,630), (348,653), (495,529)),
    ]:
        add(photo, width, [(first, zhongshan), (second, youhao)], (check, minzhu))

    # Graticule intersections or coastal landmarks. The regional checks describe
    # a single point at this map scale and cannot establish street-level accuracy.
    cape = tile_point(10, 855, 390, 420, 604)
    island = tile_point(10, 855, 390, 905, 462)
    for photo, width, controls, check in [
        (33, 1100, [((34,398), (121,39)), ((590,395), (122,39))], ((140,598), cape)),
        (84, 1000, [((128,571), cape), ((531,455), island)], ((417,422), zhongshan)),
        (313, 1200, [((306,317), (121.3261,39)), ((749,317), (122.3261,39))], ((231,475), cape)),
        (83, 1000, [((63,193), (121,39)), ((516,181), (121.5,39))], ((222,505), cape)),
        (86, 1000, [((3,376), (121,39)), ((519,370), (121.5,39))], ((184,754), cape)),
        (85, 1000, [((89,700), (121,39)), ((714,702), (123,39))], ((400,294), (122,40))),
    ]:
        add(photo, width, controls, check)

    def historic_plate(photo, prefix, width, pairs, check, polygon):
        with Image.open(next(ARCHIVE.glob(f"{prefix}_*.jpg"))) as scan:
            controls = [(xy, december_plan(*reference)) for xy, reference in pairs]
            row = fit(photo, scan.size, width, controls, (check[0], december_plan(*check[1])))
            row.update(reference="historic", masked=True)
            rows.append(row)
            save_mask(scan, width, polygon, photo)

    historic_plate(310, "12", 1000,
        [((314,666),(287,770)), ((844,425),(918,487)), ((459,402),(463,458))],
        ((339,458),(325,530)),
        [(112,40),(868,40),(872,587),(696,587),(697,716),(200,716),(200,590),(115,590)])
    historic_plate(311, "13", 1000,
        [((497,504),(287,770)), ((858,350),(918,487)), ((599,364),(463,458))],
        ((511,404),(325,530)),
        [(54,37),(929,39),(950,473),(654,473),(657,742),(25,750)])

    # Lüshun street junctions and the civilian station. The Sytin sheet uses a
    # small-scale diagram around Dalian's squares.
    def lushun(x, y):
        return tile_point(15, 27417, 12544, x, y)

    add(315, 1000, [((148,452), lushun(163,657)), ((492,363), lushun(815,474))], ((553,425), lushun(929,589)))
    add(316, 1200, [((566,821), zhongshan), ((581,790), minzhu)], ((545,831), youhao))
    historic_plate(314, "16", 1200,
        [((534,545),(464,457)), ((615,723),(505,507)), ((660,648),(514,488))],
        ((714,620),(542,477)),
        [(526,21),(946,21),(946,219),(1182,219),(1182,799),(18,799),(18,347),(526,347)])

    # The peninsula sheet contains an independently scaled Port Arthur inset.
    with Image.open(PUBLIC / "img/p/84.webp") as scan:
        save_mask(scan, 1000, [(25,22),(970,18),(971,438),(654,438),(654,655),(31,658)], 84)
    next(row for row in rows if row["photo"] == 84)["masked"] = True
    REGISTRY.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
